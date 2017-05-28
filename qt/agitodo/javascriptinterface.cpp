#include <QHostInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkRequest>
#include <QStringList>
#include <QFileInfo>
#include <QDesktopServices>

#include <QDebug>

#include "javascriptinterface.h"
#include "mainwindow.h"
#include "server.h"
#include "filesys.h"

JavaScriptInterface::JavaScriptInterface(MainWindow *win)
{
    this->win = win;
    sys = new FileSys();

    DROPBOX_APP_KEY = "DROPBOX_APP_KEY";
    DROPBOX_APP_SECRET = "DROPBOX_APP_SECRET";
    GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID";
    GOOGLE_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET";

    REDIRECT_URI = "http://localhost:8081/oauth-code";

    net = new QNetworkAccessManager(this);

    connect(net, SIGNAL(finished(QNetworkReply*)), this, SLOT(httpResponse(QNetworkReply*)));

    server = new Server();
}

JavaScriptInterface::~JavaScriptInterface()
{
    delete net;
}

void JavaScriptInterface::quit()
{
    win->exit();
}

void JavaScriptInterface::log(QString msg)
{
    qDebug() << msg;
}

void JavaScriptInterface::openUrl(QString url)
{
    QDesktopServices::openUrl(QUrl(url, QUrl::TolerantMode));
}

QString JavaScriptInterface::dbRead()
{
    return sys->readFile(win->dbPath);
}

void JavaScriptInterface::dbWrite(QString data)
{
    sys->saveString(win->dbPath, data);
}

void JavaScriptInterface::httpResponse(QNetworkReply *reply)
{
    QVariant statusCode = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute);

    int status = -1;
    QString body = "";

    if (!statusCode.isNull()) {
        status = statusCode.toInt();
        body = QString(reply->readAll());
    }

    qDebug() << status;
    qDebug() << body;

    emit jsCallback(status, body);

    //if (reply->error() == QNetworkReply::NoError)

    reply->deleteLater();
}

void JavaScriptInterface::httpRequest(QString method, QString host, QString path, QMap<QString, QString> params, QMap<QString, QString> headers, QString body)
{
    QUrl url = QUrl("https://" + host + path);

    if (!params.isEmpty()) {
        QUrlQuery query;

        for (QMap<QString, QString>::const_iterator i = params.constBegin(); i != params.constEnd(); ++i)
        {
            query.addQueryItem(i.key().toLatin1(), i.value().toLatin1());
        }

        url.setQuery(query);
    }

    QNetworkRequest req;
    req.setUrl(url);

    if (!headers.isEmpty()) {
        for (QMap<QString, QString>::const_iterator i = headers.constBegin(); i != headers.constEnd(); ++i)
        {
            req.setRawHeader(i.key().toLatin1(), i.value().toLatin1());
        }
    }

    if (method == "GET")
    {
        net->get(req);
    }
    else if (method == "POST")
    {
        net->post(req, body.toUtf8());
    }
    else if (method == "PUT")
    {
        net->put(req, body.toUtf8());
    }
}

bool JavaScriptInterface::oauthUrl(int selection)
{
    QString url;
    QUrlQuery query;

    if (!server->open()) {
        return false;
    }

    switch (selection)
    {
    case 0:
        query.addQueryItem("response_type", "code");
        query.addQueryItem("client_id", DROPBOX_APP_KEY);
        query.addQueryItem("redirect_uri", REDIRECT_URI);
        query.addQueryItem("force_reapprove", "true");
        url = "https://www.dropbox.com/1/oauth2/authorize?" + query.toString();
        break;
    case 1:
        query.addQueryItem("response_type", "code");
        query.addQueryItem("client_id", GOOGLE_CLIENT_ID);
        query.addQueryItem("redirect_uri", REDIRECT_URI);
        query.addQueryItem("scope", "https://www.googleapis.com/auth/drive.appdata");
        query.addQueryItem("include_granted_scopes", "false");
        url = "https://accounts.google.com/o/oauth2/auth?" + query.toString();
        break;
    case 2:
        query.addQueryItem("response_type", "code");
        query.addQueryItem("client_id", GOOGLE_CLIENT_ID);
        query.addQueryItem("redirect_uri", REDIRECT_URI);
        query.addQueryItem("scope", "https://www.googleapis.com/auth/gmail.compose");
        query.addQueryItem("include_granted_scopes", "false");
        url = "https://accounts.google.com/o/oauth2/auth?" + query.toString();
        break;
    }

    openUrl(url);

    return true;
}

QString JavaScriptInterface::oauthCode()
{
    return QString("{\"code\":\"%1\",\"error\":\"%2\"}").arg(server->code).arg(server->error);
}

void JavaScriptInterface::dropboxToken(QString code)
{
    QUrlQuery body;
    body.addQueryItem("code", code);
    body.addQueryItem("grant_type", "authorization_code");
    body.addQueryItem("client_id", DROPBOX_APP_KEY);
    body.addQueryItem("client_secret", DROPBOX_APP_SECRET);
    body.addQueryItem("redirect_uri", REDIRECT_URI);

    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Content-Type", "application/x-www-form-urlencoded");

    httpRequest("POST", "api.dropbox.com", "/1/oauth2/token", params, headers, body.toString());
}

void JavaScriptInterface::dropboxFileGet(QString access_token, QString path)
{
    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);

    QMap<QString, QString> params;

    httpRequest("GET", "api-content.dropbox.com", "/1/files/sandbox" + path, params, headers, "");
}

void JavaScriptInterface::dropboxFilePut(QString access_token, QString path, QString body)
{
    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);
    headers.insert("Content-Type", "text/plain; charset=utf-8");

    httpRequest("POST", "api-content.dropbox.com", "/1/files_put/sandbox" + path, params, headers, body);
}

void JavaScriptInterface::gdriveToken(QString code, bool refresh)
{
    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Content-Type", "application/x-www-form-urlencoded");

    QUrlQuery body;

    body.addQueryItem("client_id", GOOGLE_CLIENT_ID);
    body.addQueryItem("client_secret", GOOGLE_CLIENT_SECRET);

    if (refresh) {
        body.addQueryItem("refresh_token", code);
        body.addQueryItem("grant_type", "refresh_token");
    } else {
        body.addQueryItem("code", code);
        body.addQueryItem("grant_type", "authorization_code");
        body.addQueryItem("redirect_uri", REDIRECT_URI);
    }

    httpRequest("POST", "accounts.google.com", "/o/oauth2/token", params, headers, body.toString());
}

void JavaScriptInterface::gdriveList(QString access_token, QString filename)
{
    QMap<QString, QString> params;
    params.insert("q", "'appdata' in parents" + ((filename == "*") ? "":" AND title='" + filename + "' AND trashed=false"));

    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);

    httpRequest("GET", "www.googleapis.com", "/drive/v2/files", params, headers, "");
}

void JavaScriptInterface::gdriveNewFile(QString access_token, QString filename, QString content)
{
    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);
    headers.insert("Content-Type", "multipart/related; boundary=\"part\"");

    QString body;
    body.append("--part");
    body.append("\n");
    body.append("Content-Type: application/json; charset=UTF-8");
    body.append("\n\n");
    body.append(QString("{\"title\":\"%1\",\"parents\":[{\"id\":\"appdata\"}]}").arg(filename));
    body.append("\n\n");
    body.append("--part");
    body.append("\n");
    body.append("Content-Type: text/plain; charset=UTF-8");
    body.append("\n\n");
    body.append(content);
    body.append("\n\n");
    body.append("--part--");

    httpRequest("POST", "www.googleapis.com", "/upload/drive/v2/files?uploadType=multipart", params, headers, body);
}

void JavaScriptInterface::gdriveUpdateFile(QString access_token, QString fileId, QString content)
{
    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);
    headers.insert("Content-Type", "text/plain; charset=UTF-8");

    httpRequest("PUT", "www.googleapis.com", "/upload/drive/v2/files/" + fileId + "?uploadType=media", params, headers, content);
}

void JavaScriptInterface::gdriveGetFile(QString access_token, QString downloadUrl)
{
    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);

    QUrl url = QUrl(downloadUrl);

    httpRequest("GET", url.host(), url.path() + (url.hasQuery() ? "?" + url.query():""), params, headers, "");
}

void JavaScriptInterface::gmailToken(QString code, bool refresh)
{
    QUrlQuery body;

    body.addQueryItem("client_id", GOOGLE_CLIENT_ID);
    body.addQueryItem("client_secret", GOOGLE_CLIENT_SECRET);

    if (refresh) {
        body.addQueryItem("refresh_token", code);
        body.addQueryItem("grant_type", "refresh_token");
    } else {
        body.addQueryItem("code", code);
        body.addQueryItem("grant_type", "authorization_code");
        body.addQueryItem("redirect_uri", REDIRECT_URI);
    }

    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Content-Type", "application/x-www-form-urlencoded");

    httpRequest("POST", "accounts.google.com", "/o/oauth2/token", params, headers, body.toString());
}

void JavaScriptInterface::gmailSend(QString access_token, QString to, QString subject, QString content)
{
    QMap<QString, QString> params;

    QMap<QString, QString> headers;
    headers.insert("Authorization", "Bearer " + access_token);
    headers.insert("Content-Type", "message/rfc822");

    QString body;
    body.append("To: <" + to + ">\r\n");
    body.append("Subject: =?UTF-8?B?" + subject.toUtf8().toBase64() + "?=\r\n");
    body.append("Content-Type: text/html; charset=UTF-8\r\n");
    body.append("Content-Transfer-Encoding: base64\r\n");
    body.append("\r\n");
    body.append(content.toUtf8().toBase64());

    httpRequest("POST", "www.googleapis.com", "/upload/gmail/v1/users/me/messages/send?uploadType=media", params, headers, body);
}
