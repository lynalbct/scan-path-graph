import re
#Convert data to tbs format
#For fixation data
def convert(strr):
    strList = strr.splitlines()
    for i in range(len(strList)):
        a = strList[i].split(" ")
        print (a[2]+"\t"+a[3]+"\t"+str((int(a[1]) - int(a[0])) * (1000.0/120)))

while 1 == 1:
    a = raw_input("string")
    convert(a)
