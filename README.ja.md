[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

[xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet) の構成を参考に、プライベート Planet、組み込み Controller、ztncui 管理画面を Docker Compose で構築・運用するために更新したプロジェクトです。

元のプロジェクトは、プライベート Planet を簡単に導入できる優れた仕組みだと感じていました。今回の Node.js の脆弱性調査をきっかけに実行環境全体を見直し、使っていた環境で古くなっていた ZeroTier 本体も更新しました。xubiaolin と貢献者の皆様、ztncui を開発した Key Networks、ZeroTier の開発者の皆様に感謝します。本プロジェクトは独立したもので、各プロジェクトの公式配布物ではありません。[出典・ライセンス](THIRD_PARTY_NOTICES.md)（英語）をご覧ください。

## 構成と対象範囲

ZeroTier **1.16.2**、Node.js **24.22.1**、Alpine **3.24** ベース、argon2 **0.45.1**、Bootstrap **5.3.8**。コンテナは UID 10001、追加 capability なし、読み取り専用のルートファイルシステムで動作します。privileged や TUN は不要です。サーバー自身はユーザーの仮想ネットワークに参加しません。SSO は無効です。

このページは導入ガイドです。各手順の詳しい期待結果や Git が失敗した場合の取得方法は、[英語の完全版 README](README.md) にあります。検証済みの対象は Linux amd64 です。

## 導入前の確認

- 既存環境では新規初期化を行わず、[移行・バックアップ手順](docs/MIGRATION.md)を確認してください。
- [Controller のライセンス](docs/LICENSING.md)を確認してください。`ZT_NONFREE=1` はコンパイルを有効にするだけで、ライセンス条件を解除しません。条件に合う個人の非商用利用と、完成イメージの再配布は別の問題です。この Controller を含む公開のビルド済みイメージは提供していません。
- identity、データベース、アカウント、署名鍵は一緒にバックアップしてください。`data/`、`.env`、バックアップを公開しないでください。

## 新規インストール

コマンドは Ubuntu サーバー上で root として実行します。必要なら最初に `sudo -i` を実行してください。Docker Engine と Compose v2.24 以降が必要です。未導入の場合は [Docker 公式手順](https://docs.docker.com/engine/install/ubuntu/)に従ってください。メモリ約 2 GB、空きディスク 8 GB 以上を目安にしてください。

```bash
docker version
```

```bash
docker compose version
```

Git がなければ `apt-get update`、続いて `apt-get install -y git` を実行します。

```bash
git clone https://github.com/ozil56/docker-zerotier-planet-modern.git
```

```bash
cd docker-zerotier-planet-modern
```

以降のサーバー側コマンドは、このディレクトリ内で実行します。

```bash
cp .env.example .env
```

```bash
nano .env
```

`PUBLIC_IPV4` を実際の公開 IPv4 に変更します。`203.0.113.10` は例示用で、そのまま使用できません。IPv6 の経路と到達性を確認していなければ `PUBLIC_IPV6` は空欄にします。ライセンスを読み、自分の用途が条件を満たすと確認したら `ACCEPT_ZEROTIER_SOURCE_LICENSE=yes` にします。`UI_BIND` と `DOWNLOAD_BIND` は `127.0.0.1` のままにします。標準の UDP `9994` をホストのファイアウォールとクラウドのセキュリティグループで許可してください。

```bash
chmod 600 .env
```

```bash
docker compose config --quiet
```

```bash
docker compose build planet
```

ビルドの正常終了を待ちます。公開ベースイメージから自分でビルドするだけなら Docker Hub アカウントは不要です。ブラウザーのログイン状態はサーバーの Docker CLI に引き継がれません。本プロジェクトの取得に `docker compose pull` は使いません。

```bash
docker compose --profile tools run --rm init
```

`Initialized` が表示されることを確認します。初期化は一度だけです。既存の identity を守るため、空でないデータディレクトリへの初期化は拒否されます。

```bash
cat data/initial-admin-password.txt
```

ユーザー名は `admin` です。ランダム生成されたパスワードは自分の端末だけで確認し、パスワード管理ソフトへ保存した後、初期の平文ファイルを削除します。出力を公開しないでください。

```bash
rm -- data/initial-admin-password.txt
```

```bash
docker compose up -d --no-build planet
```

```bash
docker compose ps
```

約 30〜60 秒待ち、`healthy` を確認します。本体のバージョンも確認します。

```bash
docker compose exec planet zerotier-cli -D/var/lib/zerotier-one info
```

**自分のパソコン**でサーバーのアドレスを置き換えて実行し、この接続を開いたままにします。

```bash
ssh -N -L 3443:127.0.0.1:3443 -L 3000:127.0.0.1:3000 root@YOUR_SERVER_IP
```

**http://127.0.0.1:3443**（HTTPS ではなく HTTP）を開いてログインします。[クライアント手順](docs/CLIENTS.md)に従い、プライベートネットワークを作成し、`data/dist/planet` だけを配布し、2 台のクライアントを承認して相互通信を確認します。Controller API を公開しないでください。

短時間の停止を利用者へ通知した後、最初のバックアップを取得します。

```bash
sh scripts/backup.sh
```

バックアップは秘密情報を含み、**暗号化されていません**。暗号化してサーバー外にも保存してください。詳しくは英語の[復元手順](docs/BACKUP.md)、[トラブルシューティング](docs/TROUBLESHOOTING.md)、[検証記録](docs/VALIDATION.md)をご覧ください。

ali-test で、新規導入、Linux クライアント 2 台、再起動、バックアップ復元までを 2 回検証しました。すべてのクライアント OS、ARM、実際のインターネット上の NAT 構成を検証したわけではありません。再起動後は管理画面への再ログインが必要ですが、identity とネットワークは保持されます。
