import Link from "next/link";
import type { ModelShare } from "@/lib/queries/dashboard";

export function TopModels({ models }: { models: ModelShare[] }) {
  if (models.length === 0) {
    return (
      <p className="py-4 text-center text-[12px] text-muted-foreground">
        Photograph a vehicle to reveal your most-covered models.
      </p>
    );
  }

  const max = Math.max(...models.map((model) => model.photos), 1);

  return (
    <ul className="space-y-2.5">
      {models.map((model) => (
        <li key={`${model.manufacturer ?? ""}-${model.model}`}>
          <Link
            href={`/sightings?model=${encodeURIComponent(model.model)}`}
            className="group block rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] text-foreground group-hover:text-primary">
                {model.model}
                {model.manufacturer ? (
                  <span className="text-muted-foreground"> · {model.manufacturer}</span>
                ) : null}
              </span>
              <span className="tabular shrink-0 text-[10.5px] text-muted-foreground">
                {model.photos} photo{model.photos === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent/80"
                style={{ width: `${Math.max(5, (model.photos / max) * 100)}%` }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
