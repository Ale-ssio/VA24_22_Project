import pandas as pd

# Load the dataset
file_path = "./data/VA_players_with_mrtkv.csv"
df = pd.read_csv(file_path)

# Columns to exclude from per-90 conversion
excluded_cols = [
    'Id', 'Player', 'Nation', 'Pos', 'Squad', 'Comp', 
    'Age', 'Born', 'MP', 'Starts', 'Min', 'market_value_in_eur'
]

# Identify columns that are numeric and not in the excluded list
numeric_cols = df.select_dtypes(include='number').columns
stat_cols = [col for col in numeric_cols if col not in excluded_cols and col != 'Min']

# Create new per-90 columns
for col in stat_cols:
    df[col + '_per90'] = df[col] / df['Min'] * 90

# Drop original columns
df.drop(columns=stat_cols, inplace=True)

#move column 'market_value_in_eur' to the end
data = df[[col for col in df.columns if col != 'market_value_in_eur'] + ['market_value_in_eur']]

# Filter only the per90 columns
per90_cols = [col for col in df.columns if col.endswith('_per90')]

# Fill missing values in per90 columns with 0 instead of dropping rows
df_filled = data.copy()
df_filled[per90_cols] = data[per90_cols].fillna(0)

# Convert the new dataframe to a csv dataset without saving the row names.
df_filled.to_csv('VA_per90.csv', index=False)

print(df_filled.head)

print("Done!")
