"use client";

/** The build plate picker, lifted out of Scaid's larger print controls. */
import { useState } from "react";
import { SquaresFour } from "@phosphor-icons/react";
import { Dropdown, type DropdownOption } from "./Dropdown";
import { MAX_PLATE_MM, MIN_PLATE_MM, PLATE_PRESETS } from "@/lib/types";

const CUSTOM = "custom";

const clampPlate = (value: number) => Math.min(MAX_PLATE_MM, Math.max(MIN_PLATE_MM, Math.round(value)));

export function PlateSizePicker({
  plateSizeMm,
  onChange,
}: {
  plateSizeMm: number;
  onChange: (next: number) => void;
}) {
  const isPreset = (PLATE_PRESETS as readonly number[]).includes(plateSizeMm);
  const [custom, setCustom] = useState(!isPreset);

  // The text being typed is held separately from the committed size. Without this you can't
  // type "20" on the way to "200", because the intermediate value is out of range and would
  // be rejected — leaving the field stuck.
  const [draft, setDraft] = useState(String(plateSizeMm));

  const options: ReadonlyArray<DropdownOption<string>> = [
    ...PLATE_PRESETS.map((size) => ({ value: String(size), label: `${size}mm plate` })),
    { value: CUSTOM, label: "Custom…" },
  ];

  function commit(text: string) {
    const parsed = Number(text);
    if (!text.trim() || !Number.isFinite(parsed)) return;
    onChange(clampPlate(parsed));
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* The picker stays put in custom mode, so choosing a preset is always one click away. */}
      <Dropdown
        label="Build plate size"
        icon={<SquaresFour size={16} weight="duotone" className="text-cyan-400" />}
        value={custom ? CUSTOM : String(plateSizeMm)}
        options={options}
        onChange={(next) => {
          if (next === CUSTOM) {
            setCustom(true);
            setDraft(String(plateSizeMm));
            return;
          }
          setCustom(false);
          onChange(Number(next));
        }}
      />

      {custom && (
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Custom build plate size in millimeters</span>
          <input
            type="number"
            inputMode="numeric"
            value={draft}
            min={MIN_PLATE_MM}
            max={MAX_PLATE_MM}
            autoFocus
            onChange={(event) => {
              setDraft(event.target.value);
              commit(event.target.value);
            }}
            onBlur={() => {
              // Snap whatever they left behind into range so the field never shows a value
              // the preview isn't actually using.
              const parsed = Number(draft);
              const next = Number.isFinite(parsed) && draft.trim() ? clampPlate(parsed) : plateSizeMm;
              setDraft(String(next));
              onChange(next);
            }}
            className="w-20 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 font-medium text-mist-100 focus:border-volt-500 focus:outline-none"
          />
          <span className="text-mist-500">mm</span>
        </label>
      )}
    </div>
  );
}

/**
 * What the model is: its size, and everything else measurable about it.
 *
 * The size stays on the toolbar because it's the number people check constantly. The rest
 * sits one click behind it rather than in a panel of its own — these are facts about the
 * model, and a panel would hide the model you're reading them about.
 *
 * Labelled "Model" explicitly because it sits next to the plate picker, where bare numbers
 * read as though they describe the printer bed and look broken when they don't change with it.
 */
