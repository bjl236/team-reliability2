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
gert::git_pull()                        # 1. get your teammates' latest commits
gert::git_add(dir(all.files = TRUE))    # 2. stage every new or edited file
gert::git_commit_all("my first commit") # 3. record a snapshot, with a message
gert::git_push() 
library(credentials)

credentials::set_github_pat()
gert::git_remote_list()

gert::git_push()
library(credentials)

credentials::git_credential_forget(
  "https://github.com"
)

credentials::set_github_pat(
  force_new = TRUE
credentials::set_github_pat(
  force_new = TRUE
)
gert::git_pull()                        # 1. get your teammates' latest commits
gert::git_add(dir(all.files = TRUE))    # 2. stage every new or edited file
gert::git_commit_all("my first commit") # 3. record a snapshot, with a message
gert::git_push()

## TEST MESSAGE

gert::git_add(dir(all.files = TRUE))    # 2. stage every new or edited file
gert::git_commit_all("hello world 2") # 3. record a snapshot, with a message
gert::git_push()
