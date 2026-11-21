import { ProgressBar } from "@/components/ui/progress-bar";
import { formatGrams } from "@/utils/format";

type Macro = { label: string; eaten: number; target: number; fill: string };

export function MacroList({ protein, carbs, fat }: { protein: [number, number]; carbs: [number, number]; fat: [number, number] }) {
  const macros: Macro[] = [
    { label: "Protein", eaten: protein[0], target: protein[1], fill: "bg-protein" },
    { label: "Carbs", eaten: carbs[0], target: carbs[1], fill: "bg-carbs" },
    { label: "Fat", eaten: fat[0], target: fat[1], fill: "bg-fat" },
  ];
  return (
    <ul className="space-y-3.5">
      {macros.map((m) => (
        <li key={m.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-medium">{m.label}</span>
            <span>
              <span className="font-semibold">{formatGrams(m.eaten)}</span>
              <span className="text-ink-muted"> / {formatGrams(m.target)} g</span>
            </span>
          </div>
          <ProgressBar value={m.eaten} max={m.target} fillClass={m.fill} label={`${m.label} eaten against target`} />
        </li>
      ))}
    </ul>
  );
}
