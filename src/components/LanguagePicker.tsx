import { LANGUAGES } from "@/lib/languages";

// Checkbox grid of languages. Submits one "languages" value per ticked box.
export function LanguagePicker({ selected }: { selected: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
      {LANGUAGES.map((l) => (
        <label key={l.code} className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="languages" value={l.code} defaultChecked={selected.includes(l.code)} className="accent-brand" />
          {l.name}
        </label>
      ))}
    </div>
  );
}
