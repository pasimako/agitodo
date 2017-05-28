#include "server.h"
#include "filesys.h"

Server::Server(QObject *parent) : QObject(parent)
{
    MAX_WAIT = 10 * 60000;  // Minutes to milliseconds

    sys = new FileSys();
    tcpServer = new QTcpServer(this);

    connect(tcpServer, SIGNAL(newConnection()), this, SLOT(newConnection()));

    timer = new QTimer();
    timer->setSingleShot(true);

    connect(timer, SIGNAL(timeout ()), this, SLOT(close()));
}

Server::~Server()
{
    tcpServer->close();

    delete sys;
    delete tcpServer;
    delete timer;
}

bool Server::open()
{
    code.clear();
    error.clear();

    bool isListening = tcpServer->isListening();

    if (!isListening) {
        isListening = tcpServer->listen(QHostAddress::Any, 8081);
    }

    if (isListening) {
        timer->start(MAX_WAIT);
    }

    return isListening;
}

void Server::close()
{
    timer->stop();
    tcpServer->close();
}

bool Server::isListening()
{
    return tcpServer->isListening();
}

void Server::newConnection()
{
    while (tcpServer->hasPendingConnections())
    {
        QTcpSocket *socket = tcpServer->nextPendingConnection();

        connect(socket, SIGNAL(readyRead()), SLOT(readyRead()));
        connect(socket, SIGNAL(disconnected()), SLOT(disconnected()));

        QByteArray *buffer = new QByteArray();

        buffers.insert(socket, buffer);
    }
}

void Server::disconnected()
{
    QTcpSocket *socket = static_cast<QTcpSocket*>(sender());

    QByteArray *buffer = buffers.value(socket);

    socket->deleteLater();

    delete buffer;

    emit close();
}

void Server::readyRead()
{
    QTcpSocket *socket = static_cast<QTcpSocket*>(sender());

    QByteArray *buffer = buffers.value(socket);

    bool validRequest = false;

    while (socket->bytesAvailable() > 0)
    {
        buffer->append(socket->readAll());

        if (!buffer->endsWith("\r\n\r\n") && !buffer->endsWith("\n\n")) {continue;}

        QStringList lines = QString::fromLatin1(*buffer).split(QRegExp("[\r\n]"),QString::SkipEmptyParts);

        for (int i=0; i<lines.length(); i++)
        {
            if (lines[i].startsWith("GET /oauth-code?")) {
                QUrlQuery query(QUrl(lines[i].mid(4, lines[i].lastIndexOf(" ") - 4)).query());

                if (query.hasQueryItem("code")) {
                    code = query.queryItemValue("code");
                } else if (query.hasQueryItem("error")) {
                    error = query.queryItemValue("error");
                }

                validRequest = true;
            }
        }

        if (socket->state() == QAbstractSocket::ConnectedState) {
            if (validRequest) {
                QString html;

                if (!code.isEmpty()) {
                    html = sys->readFile("://res/ok.html").arg(code);
                } else {
                    html = sys->readFile("://res/error.html").arg(error);
                }

                socket->write("HTTP/1.1 200 OK\r\n");
                socket->write("Connection: close\r\n");
                socket->write("Content-Type: text/html\r\n");
                socket->write("Content-Length: " + QString::number(html.toUtf8().length()).toLatin1() + "\r\n");
                socket->write("\r\n");
                socket->write(html.toUtf8());
                socket->write("\r\n\r\n");
            } else {
                socket->write("HTTP/1.1 404 Not Found\r\n");
                socket->write("Connection: close\r\n");
                socket->write("\r\n");

                error = "Invalid request";
            }

            socket->waitForBytesWritten();
        } else {
            error = "Connection closed";
        }
    }
}
