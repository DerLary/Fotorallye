# Geteilte Bestenliste mit Supabase (kostenlos)

Damit sehen alle Spieler dieselbe All-Time-Bestenliste – auch auf GitHub Pages.
Supabase hat einen dauerhaft kostenlosen Tarif, der dafür locker reicht.

## Schritt 1 – Projekt anlegen
1. Auf <https://supabase.com> registrieren und ein neues Projekt erstellen.
2. Region möglichst nah (z.B. „Frankfurt / eu-central-1").

## Schritt 2 – Tabelle + Regeln anlegen
Im Supabase-Dashboard links auf **SQL Editor**, dieses Skript einfügen und
ausführen:

```sql
-- Tabelle für die Bestenliste
create table if not exists public.highscores (
  id     bigint generated always as identity primary key,
  name   text   not null,
  punkte bigint not null,
  set    text,
  datum  timestamptz default now()
);

-- Row Level Security einschalten
alter table public.highscores enable row level security;

-- Jede(r) darf die Liste LESEN
create policy "highscores_lesen"
  on public.highscores for select
  using (true);

-- Jede(r) darf einen Eintrag HINZUFÜGEN (aber nicht ändern/löschen)
create policy "highscores_einfuegen"
  on public.highscores for insert
  with check (true);
```

> Hinweis: Diese Regeln erlauben jedem das Eintragen (für ein Pfadfinder-Spiel
> völlig ok). Wer mehr Schutz will, kann später z.B. ein „Captcha" oder ein
> serverseitiges Limit ergänzen.

## Schritt 3 – Zugangsdaten in die App eintragen
Im Supabase-Dashboard unter **Project Settings → API**:
- **Project URL** (z.B. `https://abcd1234.supabase.co`)
- **anon public key** (langer Schlüssel, beginnt mit `eyJ...`)

Diese in `js/config.js` eintragen und das Backend umstellen:

```js
highscore: {
  backend: "supabase",          // von "local" auf "supabase" ändern
  maxEintraege: 100,
  supabase: {
    url: "https://abcd1234.supabase.co",
    anonKey: "eyJ... (anon public key)",
    tabelle: "highscores",
  },
},
```

Fertig. Der `anon`-Key ist für den Einsatz im Browser gedacht und darf
öffentlich sein (er kann nur das, was die Policies oben erlauben).
