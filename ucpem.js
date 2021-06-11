/// <reference path="./.vscode/config.d.ts" />
const { project, github } = require("ucpem")
// @ts-check

const src = project.prefix("src")

src.res("logLib")
src.res("logger",
    github("bt7s7k7/DependencyInjection").res("dependencyInjection")
)