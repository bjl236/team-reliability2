# hello world bjl236

# Confirm the file exists
file.exists("Test1.R")

# Check whether Git is already tracking it
system("git ls-files Test1.R")

# Check whether Git is ignoring it
system("git check-ignore -v Test1.R")

# Check for changes
gert::git_status()

gert::git_add("Test1.R")
gert::git_status()
