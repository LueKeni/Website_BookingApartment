const Input = ({ label, ...props }) => {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-slate-900"
      />
    </label>
  );
};

export default Input;
