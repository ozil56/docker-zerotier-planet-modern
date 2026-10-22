# 备份、迁移和灾难恢复

## 备份包含什么

`sh scripts/backup.sh` 会短暂停止本项目服务，归档整个 data、.env、compose.yaml 和当前 Docker 镜像，再恢复原运行状态。原来停止的服务仍保持停止。先通知使用者，再执行。

备份在 `backups/<UTC时间>/`：

- `state.tar.gz`：身份、网络/成员数据库、账号哈希、签名密钥、下载密钥和 Compose 配置。
- `image.tar.gz`：当前实际镜像 ID 的 Docker 导出，不依赖 mutable tag。
- `image-id.txt` 和 `SHA256SUMS`：恢复版本与完整性核对。

备份目录使用私有权限，但 tar.gz **没有加密**。应通过安全通道复制到受控离机存储并加密保存；不要提交 GitHub、上传公开文件站或发送给不可信人员。仅在同一磁盘留一份不能抵御整机丢失。

```bash
sh scripts/backup.sh
```

```bash
docker compose ps
```

预期备份脚本退出 0，原先运行的 planet 恢复 healthy。备份失败时先排查磁盘/权限并确认服务已恢复，不要宣布已备份成功。

## 恢复到一个空目录

先把当前仓库源码和某一完整备份目录复制到目标服务器。**先停止原身份的旧实例，才可让恢复实例联网；同一身份不能同时在线。** 以下 `BACKUP_DIR` 换成真实绝对路径，在 root 的 Bash 终端执行。

```bash
BACKUP_DIR=/root/private-backups/20261022T000000Z
```

```bash
cd "$BACKUP_DIR"
```

```bash
sha256sum -c SHA256SUMS
```

预期三项 OK。只使用你自己可信的备份，不要以 root 解压来源不明的 tar。

```bash
docker image load -i image.tar.gz
```

```bash
docker tag "$(cat image-id.txt)" zerotier-planet-modern:restore
```

新建空恢复目录；若已存在就停下换一个新名字：

```bash
mkdir /root/planet-restored
```

```bash
tar -xzf "$BACKUP_DIR/state.tar.gz" -C /root/planet-restored
```

```bash
cd /root/planet-restored
```

```bash
PLANET_IMAGE=zerotier-planet-modern:restore docker compose up -d --no-build planet
```

备份中的 Compose 已足够用 `--no-build` 启动。不要执行 init。检查 `docker compose ps`，重新登录 UI，核对原网络 ID、成员授权、地址池、下载文件，并用两台客户端验证互通。恢复后确认身份文件与备份一致。

若迁移后公网 IP/UDP 端口不变，客户端不需要更换 Planet。若端点改变，现有 Planet 内端点也必须处理；**不能只改 .env 就认为客户端会发现新地址**。本初始版本没有一键重签/分发端点功能，迁移前应另行规划并在隔离环境验证。

## 升级失败时回退

停止新版容器，保留失败现场，然后按上述恢复流程用升级前的镜像和数据恢复到独立目录。不要用旧程序直接覆盖/写入新版已迁移的数据。旧实例恢复健康且两台客户端测试通过，才算完成回退。禁止同身份旧、新实例同时联网。
