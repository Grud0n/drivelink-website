# DriveLink Website

Statische Landing Page für DriveLink (Support, Datenschutz, Impressum), gehostet über GitHub Pages unter [drivelink-app.de](https://drivelink-app.de).

## Setup (einmalig)

1. **Repo auf GitHub anlegen**: neues Repo erstellen, z. B. `drivelink-website` (öffentlich, da GitHub Pages im Free-Plan nur bei öffentlichen Repos ohne GitHub Pro funktioniert).
2. Diesen Ordner als Remote pushen:
   ```bash
   git remote add origin <URL des neuen GitHub-Repos>
   git branch -M main
   git push -u origin main
   ```
3. Im GitHub-Repo: **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: `main`, Ordner `/ (root)`
   - Custom domain: `drivelink-app.de` eintragen, **Enforce HTTPS** aktivieren (kann erst nach DNS-Check angehakt werden)
4. **DNS beim Domain-Anbieter einrichten** (dort, wo `drivelink-app.de` gekauft wurde):
   - 4× A-Records auf `@`/Root zeigend auf die GitHub-Pages-IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - Falls auch `www.drivelink-app.de` funktionieren soll: CNAME-Record `www` → `<github-username>.github.io`
   - DNS-Änderungen können bis zu 24h dauern.

## Vor dem Live-Schalten

- ~~Impressum ausfüllen~~ erledigt (echte Anschrift eingetragen).
- **Datenschutzerklärung** ([datenschutz.html](datenschutz.html)) ist ein Entwurf – vor Veröffentlichung im App Store rechtlich prüfen lassen.
- Support-Kontakt läuft vorerst direkt über `support.drivelink.app@gmail.com` (kein `support@drivelink-app.de`, da INWX-E-Mail-Hosting/MailProxy extra kostet – bei Bedarf später per ImprovMX o. ä. kostenlos nachrüsten).

## Lokal ansehen

Einfach `index.html` im Browser öffnen, oder mit einem lokalen Server:
```bash
python3 -m http.server 8000
```
