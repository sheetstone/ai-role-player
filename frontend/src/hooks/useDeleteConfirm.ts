import { useState, useCallback } from 'react'

/**
 * Adds a two-step "are you sure?" confirmation flow before deleting an item.
 *
 * The first click sets `deletingId` to the item's ID (which tells the UI to
 * show "Delete? Yes / No" buttons). Clicking "Yes" calls the `onDelete`
 * callback you provide and then clears `deletingId`. Clicking "No" or
 * clicking "Edit" on any item also clears `deletingId`.
 *
 * Used in `AdminPage` to prevent accidental deletion of scenarios and personas.
 *
 * @param onDelete - Async function that performs the actual delete. Receives the item's ID.
 *
 * @example
 * const { deletingId, setDeletingId, handleDelete } = useDeleteConfirm(
 *   async (id) => { await adminApi.deleteScenario(id); await reload() }
 * )
 * // In the list item:
 * {deletingId === item.id ? (
 *   <>
 *     <button onClick={() => handleDelete(item.id)}>Yes</button>
 *     <button onClick={() => setDeletingId(null)}>No</button>
 *   </>
 * ) : (
 *   <button onClick={() => setDeletingId(item.id)}>Delete</button>
 * )}
 */
export function useDeleteConfirm(onDelete: (id: string) => Promise<void>) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(async (id: string) => {
    await onDelete(id)
    setDeletingId(null)
  }, [onDelete])

  return { deletingId, setDeletingId, handleDelete }
}
