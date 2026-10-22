# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.22.1-alpine3.24
FROM ${NODE_IMAGE} AS core-build
ARG ACCEPT_ZEROTIER_SOURCE_LICENSE=no
ARG BUILD_JOBS=1
RUN test "$ACCEPT_ZEROTIER_SOURCE_LICENSE" = yes || (echo 'Read docs/LICENSING.md; eligible users must explicitly accept the upstream license.' >&2; exit 1)
RUN apk add --no-cache build-base linux-headers curl
WORKDIR /src
RUN curl --fail --location --retry 3 --connect-timeout 30 --max-time 300 \
 https://codeload.github.com/zerotier/ZeroTierOne/tar.gz/fc5c3ec22090b5b2a0f274e863651fe9ca489bf4 -o /tmp/source.tar.gz \
 && echo '5f48e6a9492cc2a31f28f9f15e7fad5e1b4a82e95fe451464ff2b32d6bed9fa4  /tmp/source.tar.gz' | sha256sum -c - \
 && tar -xzf /tmp/source.tar.gz --strip-components=1 && rm /tmp/source.tar.gz \
 && make -j"$BUILD_JOBS" ZT_NONFREE=1 ZT_CONTROLLER=0 ZT_SSO_SUPPORTED=0 zerotier-one \
 && mkdir -p /licenses/ext \
 && cp LICENSE* /licenses/ && cp nonfree/LICENSE.md /licenses/CONTROLLER.txt \
 && find ext -type f \( -iname '*license*' -o -iname 'copying*' \) -exec cp --parents '{}' /licenses/ \;

FROM ${NODE_IMAGE} AS ui-build
WORKDIR /opt/ztncui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci --omit=dev --no-fund --registry=https://registry.npmjs.org && npm cache clean --force
COPY ui/ ./

FROM ${NODE_IMAGE} AS runtime
RUN apk upgrade --no-cache && apk add --no-cache libstdc++ \
 && addgroup -g 10001 planet && adduser -D -H -u 10001 -G planet planet \
 && mkdir -p /var/lib/zerotier-one /opt/ztncui/etc /app/config /app/dist \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn* \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=core-build /src/zerotier-one /usr/local/bin/zerotier-one
RUN ln -s zerotier-one /usr/local/bin/zerotier-cli && ln -s zerotier-one /usr/local/bin/zerotier-idtool
COPY --from=core-build /licenses /usr/share/licenses/zerotier
COPY --from=ui-build /opt/ztncui /opt/ztncui
COPY runtime/ /opt/
COPY LICENSE THIRD_PARTY_NOTICES.md /usr/share/licenses/planet-modern/
WORKDIR /opt/ztncui
USER 10001:10001
ENV NODE_ENV=production HTTP_PORT=3443 HTTP_ALL_INTERFACES=true
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 CMD ["node", "/opt/health.js"]
ENTRYPOINT ["node", "/opt/supervisor.js"]
