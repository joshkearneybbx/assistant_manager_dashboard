const ASSISTANT_NAME_MAP: Record<string, string> = {
  'lily martin': 'Lily Prados'
};

export function toDisplayAssistantName(name: string): string {
  const key = name.trim().toLowerCase();
  return ASSISTANT_NAME_MAP[key] ?? name;
}

