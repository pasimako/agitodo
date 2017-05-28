#include <QFileInfo>
#include <QDir>

#include "filesys.h"
#include "mainwindow.h"

FileSys::FileSys(MainWindow *win)
{
    this->win = win;
}

QString FileSys::nativeSeparators(QString path)
{
    return QDir::toNativeSeparators(path);
}

QString FileSys::canonicalPath(QString path)
{
    return nativeSeparators(QFileInfo(path).canonicalFilePath());
}

QString FileSys::absoluteTorelative(QString path, QString base)
{
    QString rel;

    path = nativeSeparators(QFileInfo(path).absoluteFilePath());
    base = nativeSeparators(QFileInfo(base).absoluteFilePath());

    if (!path.isEmpty() && !base.isEmpty() && path.startsWith(base))
    {
        rel = nativeSeparators(QDir(base).relativeFilePath(path));
    }

    return rel;
}

QString FileSys::relativeToabsolute(QString path, QString base)
{
    return nativeSeparators(QDir(base).absoluteFilePath(path));
}

bool FileSys::testRead(QString filePath)
{
    bool ok = false;

    QFile f(filePath);

    if (f.open(QIODevice::ReadOnly | QIODevice::Text))
    {
        ok = true;
        f.close();
    }

    return ok;
}

QString FileSys::readFile(QString filePath, bool verbose)
{
    QString contents;

    if (filePath.isEmpty())
    {
        return contents;
    }

    if (!QFileInfo(filePath).isFile())
    {
        if (verbose && win != NULL)
        {
            win->showMessage(QString("Filename \"%1\" does not exist.").arg(filePath), win->MessageCritical);
        }
        return contents;
    }

    QFile f(filePath);

    if (f.open(QIODevice::ReadOnly | QIODevice::Text))
    {
        contents = QString(f.readAll());
        f.close();
    }
    else
    {
        if (verbose && win != NULL)
        {
            win->showMessage(QString("Cannot read filename \"%1\".").arg(filePath), win->MessageCritical);
        }
    }

    return contents;
}

bool FileSys::saveString(QString filePath, QString contents, bool confirmReplace, bool verbose)
{
    bool ok = false;

    if(createFile(filePath, confirmReplace, verbose))
    {
        QFile f(filePath);

        if(f.open(QIODevice::WriteOnly | QIODevice::Text))
        {
            f.write(contents.toUtf8());
            f.close();
            ok = true;
        }
    }

    return ok;
}

bool FileSys::saveBytes(QString filePath, QByteArray contents, bool confirmReplace, bool verbose)
{
    bool ok = false;

    if(createFile(filePath, confirmReplace, verbose))
    {
        QFile f(filePath);

        if(f.open(QIODevice::WriteOnly | QIODevice::Text))
        {
            f.write(contents);
            f.close();
            ok = true;
        }
    }

    return ok;
}

bool FileSys::createFile(QString filePath, bool confirmReplace, bool verbose)
{
    bool ok = false;

    if(filePath.isEmpty())
    {
        return ok;
    }

    if(QFileInfo(filePath).exists())
    {
        if(QFileInfo(filePath).isDir())
        {
            if (verbose && win != NULL)
            {
                win->showMessage(QString("Path \"%1\" is a directory.").arg(filePath), win->MessageCritical);
            }
            return ok;
        }

        if(confirmReplace && win != NULL)
        {
            if(!win->showMessage(QString("Filename \"%1\" already exists. Replace?").arg(filePath), win->MessageQuestion))
            {
                return ok;
            }
        }
    }
    else
    {
        if (verbose && win != NULL)
        {
            if(!win->showMessage(QString("Filename \"%1\" does not exist. Create?").arg(filePath), win->MessageQuestion))
            {
                return ok;
            }
        }
    }

    if (QDir().mkpath(QFileInfo(filePath).absolutePath()))
    {
        QFile f(filePath);
        if (f.open(QIODevice::WriteOnly))
        {
            f.close();
            ok = true;
        }
    }

    if(!ok)
    {
        if (verbose && win != NULL)
        {
            win->showMessage(QString("Could not open \"%1\" for write operation.").arg(filePath), win->MessageCritical);
        }
    }

    return ok;
}
