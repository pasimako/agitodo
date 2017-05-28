#ifndef SERVER_H
#define SERVER_H

#include <QtCore>
#include <QtNetwork>

class FileSys;

class Server : public QObject
{
    Q_OBJECT
public:
    QString code;
    QString error;
    explicit Server(QObject *parent = 0);
    ~Server();

    bool open();
    bool isListening();

private:
    int MAX_WAIT;

    FileSys *sys;
    QTcpServer *tcpServer;
    QHash<QTcpSocket*, QByteArray*> buffers;
    QTimer *timer;

private Q_SLOTS:
    void newConnection();
    void disconnected();
    void readyRead();
    void close();

signals:
    void dataReceived(QByteArray);
};

#endif // SERVER_H
