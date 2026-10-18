/** Replaces {name} placeholders: fmt("{count} items", { count: 3 }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export type PluralForms = { one: string; few?: string; many?: string; other: string };

/** Picks a plural form with Intl.PluralRules (Polish needs one/few/many). */
export function plural(intl: string, count: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(intl).select(count) as keyof PluralForms;
  return fmt(forms[rule] ?? forms.other, { count });
}
