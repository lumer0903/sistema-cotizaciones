import {describe,it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './Tabs';
function example(){return render(<Tabs value="first" onValueChange={vi.fn()}><TabsList aria-label="Secciones"><TabsTrigger value="first">Uno</TabsTrigger><TabsTrigger value="disabled" disabled>Deshabilitado</TabsTrigger><TabsTrigger value="second">Dos</TabsTrigger><TabsTrigger value="third">Tres</TabsTrigger></TabsList><TabsContent value="first">Contenido</TabsContent></Tabs>);}
describe('pestañas globales accesibles',()=>{
 it('enlaza la pestaña con su panel mediante IDs existentes',()=>{example();const tab=screen.getByRole('tab',{name:'Uno'});const panel=screen.getByRole('tabpanel');expect(tab.getAttribute('aria-controls')).toBe(panel.id);expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);});
 it('avanza desde el foco actual y omite pestañas deshabilitadas',async()=>{example();const user=userEvent.setup();screen.getByRole('tab',{name:'Uno'}).focus();await user.keyboard('{ArrowRight}');expect(screen.getByRole('tab',{name:'Dos'})).toHaveFocus();await user.keyboard('{ArrowRight}');expect(screen.getByRole('tab',{name:'Tres'})).toHaveFocus();});
});
