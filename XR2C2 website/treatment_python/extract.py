import pandas as pd
import json

# Step 1: Read Excel File
def read_file(path):
    return pd.read_excel(path)

try:
    dataframe = read_file('Requirements.xlsx')
    print("Excel file successfully loaded!")
    print(dataframe.head())
except FileNotFoundError as e:
    print("Error: File not found. Please check the file path.")

# Step 2: Print Columns
def read_dataframe(dataframe):
    for col in dataframe.columns:
        print(dataframe[col])

def dataframe2json(dataframe, exclude_rows=None):
    json_data = {}
    # Get the first column name, which will be used as the key for the following columns
    first_column = dataframe.columns[0]
    
    if exclude_rows is not None:
        dataframe = dataframe.drop(dataframe.index[exclude_rows])

    # Loop through the remaining columns (excluding the first column)
    for col in range(1, len(dataframe.columns)):
        # Create a dictionary with the first column value as the key and the corresponding column value as a separate dictionary
        column_data = dict(zip(dataframe[first_column], dataframe[dataframe.columns[col]]))
        json_data[dataframe.columns[col]] = column_data
    
    return json_data

# To exclude rows, do "N° of the row you want to exclude in the Excel file" - 2
# Row N°2 represents 0
json_data = dataframe2json(dataframe, exclude_rows=[4, 14, 25, 32, 46, 53, 68, 70, 76, 82, 90]) 

json_list = list(json_data.values())


with open('yourResult.json', 'w') as fileJsonList:
    json.dump(json_list, fileJsonList, indent=2, ensure_ascii=False, default=str)
