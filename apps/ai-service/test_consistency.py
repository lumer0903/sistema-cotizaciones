import unittest
from unittest.mock import patch
from fastapi import HTTPException
from app import main

def product(id,price=10,stock=10):
    return dict(id_producto=id,codigo=str(id),descripcion='flor rosa artificial',nombre_categoria='FLORES',precio_unidad_normal=price,costo_normal=5,stock_total=stock)

class ConsistencyTests(unittest.TestCase):
    def test_profit_margin_uses_price_denominator(self):
        for price,cost,expected in [(100,80,20),(100,0,100),(0,0,None),(0,10,None),(10,15,-50),(10,10,0),('0.03','0.02',33.33)]:
            with self.subTest(price=price,cost=cost):
                self.assertEqual(main.calcular_margen(price,cost),expected)
    def test_invalid_margin_inputs_are_rejected(self):
        for price,cost in [('NaN',1),(1,'Infinity'),(-1,0),(1,-1)]:
            with self.assertRaises(ValueError): main.calcular_margen(price,cost)
    def setUp(self):
        self.previous=main.MODEL
        main.MODEL=None
    def tearDown(self):
        main.MODEL=self.previous
    def test_prisma_database_url_is_compatible_with_psycopg2(self):
        with patch.object(main,'DATABASE_URL','postgresql://test:test@localhost/test?schema=public&sslmode=require'), patch.object(main.psycopg2,'connect') as connect:
            main.get_db_connection()
        self.assertEqual(connect.call_args.args[0],'postgresql://test:test@localhost/test?sslmode=require')
    def test_uninitialized_model_is_not_ready(self):
        with self.assertRaises(HTTPException) as caught:
            main.health_check()
        self.assertEqual(caught.exception.status_code,503)
    def test_empty_catalog_is_valid(self):
        with patch.object(main,'fetch_products',return_value=[]):
            self.assertEqual(main.load_products_and_train_tfidf(),0)
        self.assertEqual(main.health_check()['status'],'ok')
        self.assertEqual(main.suggest(main.RecommendRequest(id_producto=1))['similar'],[])
    def test_current_stock_zero_and_price_zero_override_cache(self):
        with patch.object(main,'fetch_products',return_value=[product(1),product(2)]):
            main.load_products_and_train_tfidf()
        with patch.object(main,'fetch_products',return_value=[product(1),product(2,0,0)]) as fetch:
            result=main.suggest(main.RecommendRequest(id_producto=1,id_almacen=7))
        self.assertEqual(result['similar'][0]['precio'],0)
        self.assertEqual(result['similar'][0]['stock'],0)
        fetch.assert_called_once_with(7)
    def test_failed_refresh_preserves_complete_previous_snapshot(self):
        with patch.object(main,'fetch_products',return_value=[product(1),product(2)]):
            main.load_products_and_train_tfidf()
        previous=main.MODEL
        with patch.object(main,'fetch_products',side_effect=RuntimeError('database down')):
            with self.assertRaises(HTTPException): main.refresh_cache()
        self.assertIs(main.MODEL,previous)
    def test_deleted_products_are_removed_from_recommendations(self):
        with patch.object(main,'fetch_products',return_value=[product(1),product(2)]):
            main.load_products_and_train_tfidf()
        with patch.object(main,'fetch_products',return_value=[product(1)]):
            self.assertEqual(main.suggest(main.RecommendRequest(id_producto=1))['similar'],[])

if __name__=='__main__': unittest.main()
