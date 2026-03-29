const Button = ({ children, type = 'button', onClick, className = '', disabled = false }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
