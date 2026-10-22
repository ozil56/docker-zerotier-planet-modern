[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

Eine modernisierte Docker-Compose-Bereitstellung für einen privaten Planet, den eingebetteten Controller und die ztncui-Oberfläche. Sie basiert auf dem Ansatz von [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet).

Ich schätze seit Langem, wie einfach das ursprüngliche Projekt einen privaten Planet bereitstellt. Die Prüfung einer aktuellen Node.js-Sicherheitslücke war der Anlass, die gesamte Laufzeit zu aktualisieren. Auch der ZeroTier-Kern meiner bisherigen Installation sollte wieder auf einen neueren Stand kommen. Vielen Dank an xubiaolin und die Mitwirkenden, Key Networks für ztncui sowie die ZeroTier-Autoren. Dies ist ein unabhängiges Projekt, keine offizielle Veröffentlichung dieser Teams. Siehe [Quellen und Lizenzen](THIRD_PARTY_NOTICES.md) auf Englisch.

## Inhalt und Umfang

ZeroTier **1.16.2**, Node.js **24.22.1**, Alpine-Basis **3.24**, argon2 **0.45.1** und Bootstrap **5.3.8**. Der Container läuft mit UID 10001, ohne privileged und ohne zusätzliche Capabilities, mit schreibgeschütztem Root-Dateisystem. TUN ist nicht nötig, da der Server selbst keinen Benutzernetzwerken beitritt. SSO ist deaktiviert.

Diese Seite führt durch die Installation. Die [vollständige englische Anleitung](README.md) enthält erwartete Ergebnisse und einen alternativen Downloadweg bei Git-Problemen. Getestet wurde Linux amd64.

## Vor dem Start

- Bei bestehenden Installationen gilt die [Migrations- und Sicherungsanleitung](docs/MIGRATION.md). Vorhandene Daten niemals neu initialisieren.
- Lesen Sie die [Controller-Lizenzhinweise](docs/LICENSING.md). `ZT_NONFREE=1` ermöglicht die Kompilierung, hebt aber keine Lizenzbedingungen auf. Zulässige persönliche, nicht kommerzielle Eigennutzung ist keine pauschale Erlaubnis zur Weitergabe kombinierter Images. Ein öffentliches fertiges Image mit diesem Controller wird nicht angeboten.
- Identität, Datenbank, Konten und Signaturschlüssel gemeinsam sichern. `data/`, `.env` und Backups nicht veröffentlichen.

## Neuinstallation

Die Befehle auf dem Ubuntu-Server als root ausführen, bei Bedarf zuerst `sudo -i`. Docker Engine und Compose ab v2.24 müssen installiert sein; andernfalls der [offiziellen Docker-Anleitung](https://docs.docker.com/engine/install/ubuntu/) folgen. Etwa 2 GB RAM und 8 GB freien Speicher einplanen.

```bash
docker version
```

```bash
docker compose version
```

Git bei Bedarf installieren (`apt-get update`, danach `apt-get install -y git`).

```bash
git clone https://github.com/ozil56/docker-zerotier-planet-modern.git
```

```bash
cd docker-zerotier-planet-modern
```

Alle weiteren Serverbefehle in diesem Verzeichnis ausführen.

```bash
cp .env.example .env
```

```bash
nano .env
```

`PUBLIC_IPV4` durch die tatsächliche öffentliche IPv4 ersetzen; `203.0.113.10` ist nur ein Platzhalter. `PUBLIC_IPV6` ohne geprüfte Erreichbarkeit leer lassen. Nach Prüfung der Lizenz und der eigenen Berechtigung `ACCEPT_ZEROTIER_SOURCE_LICENSE=yes` setzen. `UI_BIND` und `DOWNLOAD_BIND` bei `127.0.0.1` belassen. Den Standardport UDP `9994` in Host-Firewall und Cloud-Sicherheitsgruppe freigeben.

```bash
chmod 600 .env
```

```bash
docker compose config --quiet
```

```bash
docker compose build planet
```

Auf den erfolgreichen Abschluss warten. Zum lokalen Bau aus öffentlichen Basis-Images ist kein Docker-Hub-Konto nötig. Eine Browseranmeldung meldet die Docker-CLI auf dem Server nicht an. Dieses Projekt nicht mit `docker compose pull` beziehen.

```bash
docker compose --profile tools run --rm init
```

Erwartet wird `Initialized`. Nur einmal initialisieren; nicht leere Datenverzeichnisse werden zum Schutz vorhandener Identitäten abgelehnt.

```bash
cat data/initial-admin-password.txt
```

Der Benutzername ist `admin`. Das zufällige Passwort nur im eigenen Terminal lesen, in einem Passwortmanager speichern und die anfängliche Klartextkopie entfernen. Den Inhalt nicht veröffentlichen.

```bash
rm -- data/initial-admin-password.txt
```

```bash
docker compose up -d --no-build planet
```

```bash
docker compose ps
```

Nach etwa 30–60 Sekunden sollte `healthy` erscheinen. Den Kern prüfen:

```bash
docker compose exec planet zerotier-cli -D/var/lib/zerotier-one info
```

Auf **dem eigenen Computer** die Serveradresse ersetzen und diese Verbindung geöffnet lassen:

```bash
ssh -N -L 3443:127.0.0.1:3443 -L 3000:127.0.0.1:3000 root@YOUR_SERVER_IP
```

**http://127.0.0.1:3443** öffnen (HTTP, nicht HTTPS) und anmelden. Die [Client-Anleitung](docs/CLIENTS.md) beschreibt ein privates Netzwerk, die Verteilung ausschließlich von `data/dist/planet`, die Freigabe zweier Clients und den gegenseitigen Verbindungstest. Die Controller-API nicht öffentlich freigeben.

Nach Ankündigung einer kurzen Unterbrechung eine Sicherung erstellen:

```bash
sh scripts/backup.sh
```

Backups enthalten Geheimnisse und sind **nicht verschlüsselt**. Verschlüsselte Kopien außerhalb des Servers aufbewahren. Weitere englische Anleitungen: [Wiederherstellung](docs/BACKUP.md), [Fehlersuche](docs/TROUBLESHOOTING.md), [Testergebnisse](docs/VALIDATION.md).

Zwei vollständige Durchläufe auf einem Testserver in Festlandchina prüften Installation, zwei Linux-Clients, Neustart und Wiederherstellung. Das bestätigt nicht sämtliche Client-Plattformen, ARM oder öffentliche NAT-Topologien. Nach einem Neustart ist eine erneute UI-Anmeldung nötig; Identität und Netzwerke bleiben erhalten.
