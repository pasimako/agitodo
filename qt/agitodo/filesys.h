#ifndef FILESYS_H
#define FILESYS_H

#include <QString>

class MainWindow;

class FileSys
{
    MainWindow *win;

public:
    FileSys(MainWindow *win=NULL);
    bool createFile(QString filePath, bool confirmReplace=false, bool verbose=false);
    bool saveString(QString filePath, QString contents, bool confirmReplace=false, bool verbose=false);
    bool saveBytes(QString filePath, QByteArray contents, bool confirmReplace=false, bool verbose=false);
    QString readFile(QString filePath, bool verbose=false);
    QString absoluteTorelative(QString path, QString relativeTo);
    QString relativeToabsolute(QString path, QString base);
    bool testRead(QString filePath);
    QString nativeSeparators(QString path);
    QString canonicalPath(QString path);
};

#endif // FILESYS_H
