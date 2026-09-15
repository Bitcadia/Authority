FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS node
FROM ghcr.io/actions/actions-runner:2.337.0@sha256:e5496277be5d09bc968b3d64911b74e219ac4a3f2edce956a3ecf9271bea1ef4

USER root
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY deploy/omcadia/init.sh /usr/local/bin/authority-runner-init
COPY tools/sign-publication.mjs tools/validate-publication.mjs /opt/authority/tools/
COPY sources/publication.json /opt/authority/sources/publication.json
RUN chmod 755 /usr/local/bin/authority-runner-init \
    && mkdir -p /state /keys \
    && chown 1001:123 /state /keys
USER runner
WORKDIR /home/runner
ENTRYPOINT ["/usr/local/bin/authority-runner-init"]
