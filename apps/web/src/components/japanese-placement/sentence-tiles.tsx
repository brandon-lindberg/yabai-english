"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSessionDraft } from "@/hooks/use-session-draft";

export function SentenceTiles({ tiles, disabled, draftKey, onSubmit }: { tiles: Array<{ id: string; text: string }>; disabled: boolean; draftKey: string; onSubmit: (tileIds: string[]) => void }) {
  const helpId = useId();
  const sentenceId = useId();
  const tilesId = useId();
  const t = useTranslations("japanesePlacement");
  const [draft, setDraft] = useSessionDraft(draftKey, { selected: [] as string[] });
  const selected = Array.isArray(draft.selected) && new Set(draft.selected).size === draft.selected.length
    && draft.selected.every((id) => tiles.some((tile) => tile.id === id)) ? draft.selected : [];
  const setSelected = (next: string[]) => setDraft({ selected: next });
  const remove = (id: string) => setSelected(selected.filter((tileId) => tileId !== id));
  return <div className="mt-6 space-y-5">
    <p className="text-sm leading-relaxed text-muted" id={helpId}>{t("tileHint")}</p>
    <p id={sentenceId} className="text-sm font-medium text-foreground">{t("sentence")}</p>
    <div role="group" aria-labelledby={sentenceId} aria-describedby={helpId} className="min-h-24 border-y border-border py-4">
      {selected.length === 0 ? <p className="py-2 text-sm text-muted">{t("emptySentence")}</p> : <ol className="flex list-none flex-wrap gap-2 p-0" lang="ja">
        {selected.map((id, index) => { const tile = tiles.find((entry) => entry.id === id)!; return <li key={id}><Button variant="secondary" disabled={disabled} aria-label={t("removeTile", { tile: tile.text, position: index + 1 })} onClick={() => remove(id)}>{tile.text}</Button></li>; })}
      </ol>}
    </div>
    <p id={tilesId} className="text-sm font-medium text-foreground">{t("tiles")}</p>
    <div role="group" aria-labelledby={tilesId} className="flex flex-wrap gap-2" lang="ja">
      {tiles.map((tile, index) => <Button key={tile.id} variant={selected.includes(tile.id) ? "ghost" : "secondary"} disabled={disabled}
        aria-pressed={selected.includes(tile.id)} aria-label={selected.includes(tile.id) ? t("returnTile", { tile: tile.text }) : t("addTile", { tile: tile.text, position: index + 1 })}
        className="aria-pressed:bg-chip aria-pressed:text-muted"
        onClick={() => selected.includes(tile.id) ? remove(tile.id) : setSelected([...selected, tile.id])}>{tile.text}</Button>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" disabled={disabled || selected.length === 0} onClick={() => setSelected(selected.slice(0, -1))}>{t("undo")}</Button>
      <Button variant="ghost" disabled={disabled || selected.length === 0} onClick={() => setSelected([])}>{t("clear")}</Button>
    </div>
    <Button size="lg" disabled={disabled || selected.length !== tiles.length} onClick={() => onSubmit([...selected])}>{t("submitSentence")}</Button>
  </div>;
}
