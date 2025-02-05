import pandas as pd

for i in range(112):
    file1 = r"files\tmaxdaily (%d).csv" % int(i+1)
    file2 = r"files\tmindaily (%d).csv" % int(i+1)
    df1 = pd.read_csv(file1, header=None, index_col=None)
    df2 = pd.read_csv(file2, header=None, index_col=None)
    print(df1, df2)

    # Extract the required columns
    new_df = pd.DataFrame()
    new_df[0] = df1[0]
    new_df[1] = df1[1]
    new_df[2] = df2[1]
    
    # Get the value from column 3, row 4 of the first DataFrame
    new_filename = df1.iloc[1, 3]
    
    # Save the new DataFrame to a CSV file with the derived name
    new_df.to_csv(f"files/{new_filename}.csv", index=False, header=False)

