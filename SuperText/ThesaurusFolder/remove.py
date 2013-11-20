import re

thesFile = open("thesaurus.txt")
thesDict = {}
leftList = []

for line in thesFile.read().split("\n")[:-1]:
    detected_word = False
    for i in range(len(line)-1):
        if line[i] == ' ' and line[i+1] == ' ' and detected_word == False:
            detected_word = True
            start_index = i
        if detected_word == True:
            if line[i] == ' ' and line[i+1] != ' ':
                end_index = i+1;
                break
    word = line[:start_index]
    rightWords = line[end_index:]
    if word.find(" ") >= 0:
        leftList.append(word)
    else:
        thesDict[word] = rightWords

for key in thesDict.keys():
    for w in leftList:
        thesDict[key] = thesDict[key].replace(w, "")
        thesDict[key] = " ".join(re.split(" +", thesDict[key]))

for key in thesDict.keys():
    print key.ljust(20) + thesDict[key]
