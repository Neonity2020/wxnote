export default function Toast({ toast }) {
  return (
    <div className={'toast' + (toast ? ' show' : '')} role="status" aria-live="polite">
      {toast && toast.ok !== false ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="#07C160" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
      <span>{toast ? toast.msg : ''}</span>
    </div>
  );
}
