import { useState } from 'react';
export default function CatalogManager({ title, path, items, mutate, busy }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const save = async event => {
    event.preventDefault();
    const result = await mutate(editing ? `${path}/${editing}` : path, editing ? 'PATCH' : 'POST', { name });
    if (result) { setName(''); setEditing(null); }
  };
  const remove = async item => {
    if (window.confirm(`Delete ${item.name}? Records in use cannot be deleted.`)) await mutate(`${path}/${item.id}`, 'DELETE');
  };
  return <div className="panel form-panel">
    <h2>{title}</h2>
    <form className="form-grid" onSubmit={save}>
      <label>Name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <button className="primary-btn" disabled={busy}>{editing ? 'Update' : 'Add'} {title === 'Classes' ? 'Class' : 'Subject'}</button>
      {editing && <button type="button" className="small-btn" onClick={() => { setEditing(null); setName(''); }}>Cancel edit</button>}
    </form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Actions</th></tr></thead><tbody>
      {items.map(item => <tr key={item.id}><td>{item.name}</td><td className="actions">
        <button type="button" className="small-btn" disabled={busy} onClick={() => { setEditing(item.id); setName(item.name); }}>Edit</button>
        <button type="button" className="small-btn danger" disabled={busy} onClick={() => remove(item)}>Delete</button>
      </td></tr>)}
      {!items.length && <tr><td colSpan={2}>No {title.toLowerCase()} yet.</td></tr>}
    </tbody></table></div>
  </div>;
}
