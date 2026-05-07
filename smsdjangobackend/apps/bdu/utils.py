from pyexcel import Sheet, constants, _compact as compact


def trim(data):
    values = list()
    for i in data:
        if isinstance(i, str):
            values.append(i.strip())
        else:
            values.append(i)
    return values
