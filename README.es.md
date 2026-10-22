[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

Una versión modernizada de Planet privado, Controller integrado y la interfaz ztncui con Docker Compose, basada en el enfoque de [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet).

Siempre he valorado la facilidad de despliegue del proyecto original. La revisión de una vulnerabilidad reciente de Node.js me llevó a actualizar el entorno completo; también quería recuperar las mejoras del núcleo de ZeroTier que faltaban en mi instalación. Gracias a xubiaolin y sus colaboradores, a Key Networks por ztncui y a los autores de ZeroTier. Este proyecto es independiente; no es una publicación oficial de ellos. [Créditos y licencias](THIRD_PARTY_NOTICES.md) (inglés).

## Contenido y alcance

ZeroTier **1.16.2**, Node.js **24.22.1**, base Alpine **3.24**, argon2 **0.45.1** y Bootstrap **5.3.8**. El contenedor funciona con UID 10001, sin privileged ni capacidades adicionales y con el sistema raíz de solo lectura. No necesita TUN porque el servidor no se une a las redes de los usuarios. SSO está desactivado.

Esta página ofrece una introducción a la instalación. La [guía completa en inglés](README.md) contiene los pasos detallados, resultados esperados y una alternativa de descarga si Git falla. Linux amd64 es la plataforma probada.

## Antes de empezar

- Una instalación existente requiere [migración y copia de seguridad](docs/MIGRATION.md), no una nueva inicialización.
- Lea la [licencia del Controller](docs/LICENSING.md). `ZT_NONFREE=1` permite compilarlo, pero no elimina sus condiciones. El uso personal no comercial admisible no equivale a permiso para cualquier distribución. No ofrecemos una imagen pública precompilada con ese Controller.
- Guarde juntos la identidad, la base de datos, las cuentas y las claves de firma. No comparta `data/`, `.env` ni las copias de seguridad.

## Instalación nueva

Ejecute los comandos en el servidor Ubuntu, como root (`sudo -i` si hace falta). Se necesitan Docker Engine y Compose v2.24 o posterior; si faltan, siga la [documentación oficial de Docker](https://docs.docker.com/engine/install/ubuntu/). Reserve unos 2 GB de RAM y 8 GB de disco libre.

```bash
docker version
```

```bash
docker compose version
```

Instale Git si falta (`apt-get update`, después `apt-get install -y git`).

```bash
git clone https://github.com/ozil56/docker-zerotier-planet-modern.git
```

```bash
cd docker-zerotier-planet-modern
```

Todos los comandos siguientes del servidor se ejecutan en ese directorio.

```bash
cp .env.example .env
```

```bash
nano .env
```

Cambie `PUBLIC_IPV4` por la IPv4 pública real; `203.0.113.10` es solo un ejemplo. Deje `PUBLIC_IPV6` vacío si no ha comprobado su conectividad. Tras revisar la licencia y confirmar que su uso cumple sus condiciones, establezca `ACCEPT_ZEROTIER_SOURCE_LICENSE=yes`. Mantenga `UI_BIND` y `DOWNLOAD_BIND` en `127.0.0.1`. El puerto UDP predeterminado es `9994`; permita ese puerto en el cortafuegos del servidor y en el del proveedor.

```bash
chmod 600 .env
```

```bash
docker compose config --quiet
```

```bash
docker compose build planet
```

Espere a que la compilación termine correctamente. No necesita una cuenta de Docker Hub para compilar con imágenes base públicas. La sesión del navegador no autentica la CLI del servidor. No use `docker compose pull` para obtener este proyecto.

```bash
docker compose --profile tools run --rm init
```

La inicialización debe mostrar `Initialized`. Solo se ejecuta una vez; rechaza directorios de datos no vacíos.

```bash
cat data/initial-admin-password.txt
```

El usuario es `admin`. Lea la contraseña aleatoria solo en su terminal, guárdela en un gestor de contraseñas y elimine la copia inicial. No publique su contenido.

```bash
rm -- data/initial-admin-password.txt
```

```bash
docker compose up -d --no-build planet
```

```bash
docker compose ps
```

Espere unos 30–60 segundos hasta `healthy`. Compruebe el núcleo:

```bash
docker compose exec planet zerotier-cli -D/var/lib/zerotier-one info
```

En **su propio ordenador**, sustituya el servidor y mantenga abierta esta conexión:

```bash
ssh -N -L 3443:127.0.0.1:3443 -L 3000:127.0.0.1:3000 root@YOUR_SERVER_IP
```

Abra **http://127.0.0.1:3443** (HTTP, no HTTPS) e inicie sesión. Siga la [guía de clientes](docs/CLIENTS.md) para crear una red privada, distribuir solo `data/dist/planet`, autorizar dos clientes y comprobar la comunicación en ambos sentidos. No publique la API del Controller.

Tras avisar de una breve interrupción, haga la primera copia:

```bash
sh scripts/backup.sh
```

Las copias contienen secretos y **no están cifradas**; guárdelas cifradas fuera del servidor. Consulte [restauración](docs/BACKUP.md), [solución de problemas](docs/TROUBLESHOOTING.md) y [pruebas realizadas](docs/VALIDATION.md), en inglés.

Dos pruebas completas en un servidor de pruebas ubicado en China continental cubrieron instalación, dos clientes Linux, reinicio y restauración. No equivalen a validar todos los sistemas cliente, ARM o todas las topologías NAT públicas. Un reinicio requiere volver a iniciar sesión en la UI, pero conserva la identidad y las redes.
