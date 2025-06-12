# **Sequelize Field Parser Package**

## Tech Stack

> Node Typescript  
> Sequelize (MySQL)  
> GitHub Action  

## Design Patterns

> Test Driven Development  

## Integrations

> Slack  

## Setup

> **step 1: Clone the repository:**  
> `git clone `

> **step 2: Install dependencies:**  
> `npm install`

> **step 3: Build the package:**  
> `npm run build`

## Important:

> **Before pushing to git, always create your own branch, format, lint, and test, then create a pull request for your changes:**  
> `git checkout <branch>`  
> `git pull origin <branch>`  
> `git checkout -b <your-branch>`  
> `npm run format`  
> `npm run lint`  
> `npm run lint:fix` _(to fix linting errors)_  
> `npm run test` _(executes all test with code coverage)_  

> **when making a tag to release:**  
> `npm run format`  
> `npm run lint`  
> `npm run lint:fix` _(to fix linting errors)_  
> `npm run test` _(executes all test with code coverage)_  
> `npm run build` _(builds the package)_  
> `git add dist/ -f` _(pushes dist folder to git)_  
> `git commit -m "Release v1.0.0"` _(commit message format)_  
> `git tag v1.0.0` _(tag)_  
> `git push origin master --tags` _(push tags to master)_  
