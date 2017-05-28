#ifndef JAVASCRIPTINTERFACE_H
#define JAVASCRIPTINTERFACE_H

#include <QObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>

class MainWindow;
class Server;
class FileSys;

class JavaScriptInterface : public QObject
{
    Q_OBJECT
signals:
   void jsCallback(int, QString);
   void jsExit(bool);
public:
    JavaScriptInterface(MainWindow*);
    ~JavaScriptInterface();

    Q_INVOKABLE void quit();
    Q_INVOKABLE void log(QString msg);
    Q_INVOKABLE void openUrl(QString url);
    Q_INVOKABLE bool oauthUrl(int selection);
    Q_INVOKABLE QString oauthCode();

    Q_INVOKABLE void dropboxToken(QString code);
    Q_INVOKABLE void dropboxFileGet(QString access_token, QString path);
    Q_INVOKABLE void dropboxFilePut(QString access_token, QString path, QString body);

    Q_INVOKABLE void gdriveToken(QString code, bool refresh);
    Q_INVOKABLE void gdriveList(QString access_token, QString filename);
    Q_INVOKABLE void gdriveNewFile(QString access_token, QString filename, QString content);
    Q_INVOKABLE void gdriveUpdateFile(QString access_token, QString fileId, QString content);
    Q_INVOKABLE void gdriveGetFile(QString access_token, QString downloadUrl);
    Q_INVOKABLE void gmailToken(QString code, bool refresh);
    Q_INVOKABLE void gmailSend(QString access_token, QString to, QString subject, QString content);

    Q_INVOKABLE QString dbRead();
    Q_INVOKABLE void dbWrite(QString data);
private:
    QString DROPBOX_APP_KEY;
    QString DROPBOX_APP_SECRET;
    QString GOOGLE_CLIENT_ID;
    QString GOOGLE_CLIENT_SECRET;
    QString REDIRECT_URI;
    MainWindow *win;
    QNetworkAccessManager *net;
    Server *server = NULL;
    FileSys *sys;

    void httpRequest(QString method, QString host, QString path, QMap<QString, QString> params, QMap<QString, QString> headers, QString body);
public Q_SLOTS:
    void httpResponse(QNetworkReply *rep);
};

#endif // JAVASCRIPTINTERFACE_H
