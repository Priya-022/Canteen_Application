import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { CanteenMenuItem } from './menuTypes'
import { supabase } from './supabase'

type AdminPanelProps = {
  items: CanteenMenuItem[]
  loading: boolean
  loadError: string
  onItemsChange: Dispatch<SetStateAction<CanteenMenuItem[]>>
  onSignOut: () => void
}

type NewItem = Pick<CanteenMenuItem, 'name' | 'category' | 'price'>

function AdminPanel({ items, loading, loadError, onItemsChange, onSignOut }: AdminPanelProps) {
  const [newItem, setNewItem] = useState<NewItem>({ name: '', category: '', price: 0 })
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  function updateDraft(id: string, update: Partial<CanteenMenuItem>) {
    onItemsChange((current) => current.map((item) => item.id === id ? { ...item, ...update } : item))
  }

  function reportActionError(message: string, error: unknown) {
    console.error(message, error)
    const reportedMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : message
    setActionError(reportedMessage)
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setSaving(true)
    setActionError('')
    setNotice('')
    try {
      const { data, error } = await supabase
        .from('canteen_menu')
        .insert({
          name: newItem.name.trim(),
          category: newItem.category.trim(),
          price: newItem.price,
        })
        .select('id, name, category, price, is_available')
        .single()

      if (error) {
        reportActionError('Could not add canteen menu item.', error)
        return
      }

      onItemsChange((current) => [...current, data])
      setNewItem({ name: '', category: '', price: 0 })
      setNotice('Menu item added.')
    } catch (error: unknown) {
      reportActionError('Could not add canteen menu item.', error)
    } finally {
      setSaving(false)
    }
  }

  async function saveItem(item: CanteenMenuItem) {
    if (!supabase) return

    setSaving(true)
    setActionError('')
    setNotice('')
    try {
      const { data, error } = await supabase
        .from('canteen_menu')
        .update({
          name: item.name.trim(),
          category: item.category.trim(),
          price: item.price,
          is_available: item.is_available,
        })
        .eq('id', item.id)
        .select('id, name, category, price, is_available')
        .single()

      if (error) {
        reportActionError('Could not update canteen menu item.', error)
        return
      }

      onItemsChange((current) => current.map((currentItem) => currentItem.id === item.id ? data : currentItem))
      setNotice(`${data.name} saved.`)
    } catch (error: unknown) {
      reportActionError('Could not update canteen menu item.', error)
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(item: CanteenMenuItem) {
    if (!supabase || !window.confirm(`Remove ${item.name} from the menu?`)) return

    setSaving(true)
    setActionError('')
    setNotice('')
    try {
      const { error } = await supabase.from('canteen_menu').delete().eq('id', item.id)
      if (error) {
        reportActionError('Could not remove canteen menu item.', error)
        return
      }

      onItemsChange((current) => current.filter((currentItem) => currentItem.id !== item.id))
      setNotice(`${item.name} removed from the menu.`)
    } catch (error: unknown) {
      reportActionError('Could not remove canteen menu item.', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span className="eyebrow">CANTEEN MANAGEMENT</span>
          <h1>Menu & availability<span>.</span></h1>
          <p>Update what’s being served, set prices, and let students know what’s in stock.</p>
        </div>
        <button className="admin-signout-button" type="button" onClick={onSignOut}>Sign out</button>
      </header>

      <section className="admin-summary">
        <span className="admin-summary-icon" aria-hidden="true">▤</span>
        <div><strong>{items.length} menu {items.length === 1 ? 'item' : 'items'}</strong><span>Changes are shared with signed-in students.</span></div>
        <span className="admin-secure-badge"><i /> Admin access</span>
      </section>

      <section className="admin-section" id="menu-admin">
        <div className="admin-section-heading">
          <div><span className="eyebrow">TODAY’S MENU</span><h2>Manage menu items</h2></div>
          <span className="admin-section-caption">Prices in ₹ INR</span>
        </div>

        {loadError && <p className="admin-alert" role="alert">Could not load the menu: {loadError}</p>}
        {actionError && <p className="admin-alert" role="alert">Could not save that change: {actionError}</p>}
        {notice && <p className="admin-success" role="status">{notice}</p>}
        {loading && <p className="admin-empty">Loading menu…</p>}

        {!loading && !loadError && items.length === 0 && (
          <p className="admin-empty">No items on the menu yet. Add the first one below.</p>
        )}

        <div className="admin-menu-list">
          {items.map((item) => (
            <article className="admin-menu-row" key={item.id}>
              <div className="admin-menu-fields">
                <label>
                  <span>Item name</span>
                  <input value={item.name} maxLength={80} onChange={(event) => updateDraft(item.id, { name: event.target.value })} />
                </label>
                <label>
                  <span>Category</span>
                  <input value={item.category} maxLength={60} onChange={(event) => updateDraft(item.id, { category: event.target.value })} />
                </label>
                <label className="price-field">
                  <span>Price (₹)</span>
                  <input type="number" min="0" max="99999.99" step="0.01" value={item.price} onChange={(event) => updateDraft(item.id, { price: Number(event.target.value) })} />
                </label>
              </div>
              <div className="admin-menu-actions">
                <label className="availability-toggle">
                  <input type="checkbox" checked={item.is_available} onChange={(event) => updateDraft(item.id, { is_available: event.target.checked })} />
                  <span className={item.is_available ? 'availability-dot available-dot' : 'availability-dot unavailable-dot'} />
                  {item.is_available ? 'Available' : 'Unavailable'}
                </label>
                <button className="admin-save-button" type="button" disabled={saving || !item.name.trim() || !item.category.trim()} onClick={() => saveItem(item)}>Save</button>
                <button className="admin-delete-button" type="button" disabled={saving} onClick={() => deleteItem(item)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section add-item-section">
        <div className="admin-section-heading">
          <div><span className="eyebrow">ADD TO THE COUNTER</span><h2>Add a menu item</h2></div>
        </div>
        <form className="new-item-form" onSubmit={addItem}>
          <label><span>Item name</span><input value={newItem.name} maxLength={80} placeholder="e.g. Paneer wrap" onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} required /></label>
          <label><span>Category</span><input value={newItem.category} maxLength={60} placeholder="e.g. Snacks" onChange={(event) => setNewItem({ ...newItem, category: event.target.value })} required /></label>
          <label className="price-field"><span>Price (₹)</span><input type="number" min="0" max="99999.99" step="0.01" value={newItem.price} onChange={(event) => setNewItem({ ...newItem, price: Number(event.target.value) })} required /></label>
          <button className="admin-add-button" type="submit" disabled={saving}>{saving ? 'Saving…' : '＋ Add item'}</button>
        </form>
      </section>

      <p className="admin-footnote">Use “Unavailable” for sold-out items. Menu changes are protected by Supabase row-level security.</p>
    </div>
  )
}

export default AdminPanel
