ALTER TABLE alertas_stock ADD CONSTRAINT alertas_stock_no_negativo CHECK(stock_actual>=0 AND stock_minimo>=0) NOT VALID;
ALTER TABLE alertas_stock VALIDATE CONSTRAINT alertas_stock_no_negativo;
