export default function PortalStatus({ loading, busy, error, refresh }) {
  return <>
    {(loading || busy) && <p role="status">{loading ? 'Loading records…' : 'Saving changes…'}</p>}
    {error && <div role="alert" className="panel form-panel"><p>{error}</p><button className="small-btn" type="button" onClick={refresh}>Refresh records</button></div>}
  </>;
}
