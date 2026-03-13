/**
 * api.js
 * ------
 * Módulo centralizado de llamadas a la API del backend.
 * Separa la lógica de fetch del resto de componentes para facilitar
 * el mantenimiento y posibles cambios de URL o autenticación.
 */

const API = 'http://127.0.0.1:8000';

/**
 * Elimina un atardecer de la base de datos por su ID.
 * Lanza un error si la respuesta no es OK para que el componente
 * que lo llama pueda mostrarlo al usuario.
 */
export async function deleteSunset(id) {
  const res = await fetch(`${API}/sunsets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar');
}

/**
 * Alterna el estado de favorito de un atardecer (toggle).
 * Devuelve { id, is_favorite } con el nuevo estado para que
 * el componente actualice la UI sin recargar.
 */
export async function toggleFavorite(id) {
  const res = await fetch(`${API}/sunsets/${id}/favorite`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al actualizar favorito');
  return res.json();
}
