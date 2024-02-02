/// <reference path="./.vscode/config.d.ts" />
const { project, github } = require("ucpem")
// @ts-check

const src = project.prefix("src")

src.res("logLib")
const prettyPrint = src.res("prettyPrint")
const dependencyInjection = github("bt7s7k7/DependencyInjection")
const logger = src.res("logger",
    dependencyInjection.res("dependencyInjection"),
    prettyPrint
)

src.res("nodeLogger",
    logger
)

src.res("vueLogger",
    logger,
    dependencyInjection.res("dependencyInjectionVue"),
    github("bt7s7k7/Vue3GUI").res("vue3gui")
)
