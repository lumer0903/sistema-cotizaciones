import { Navigate } from 'react-router-dom';
import { authSession } from '../../application/auth/authSession';
import { can } from '../../application/auth/permissions';

export function ProtectedPage({ route, children }) {
  const session = authSession.get();
  if (!session?.token || !session?.usuario) return <Navigate to="/login" replace />;
  if (route.roles?.length && !route.roles.includes(session.usuario.rol)) return <Navigate to="/dashboard" replace />;
  if (!can(session.usuario, route.permission)) return <Navigate to="/dashboard" replace />;
  return children;
}
