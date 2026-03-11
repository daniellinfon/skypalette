const API = 'http://127.0.0.1:8000';

export async function deleteSunset(id) {
  const res = await fetch(`${API}/sunsets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar');
}

export async function toggleFavorite(id) {
  const res = await fetch(`${API}/sunsets/${id}/favorite`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al actualizar favorito');
  return res.json(); // { id, is_favorite }
}
