#!/usr/bin/env node
/**
 *
 * User: wuliang142857 (wuliang142857@gmail.com)
 * Date: 2021/07/09
 * Time: 14:10
 *
 */

import MarkdownIt from "markdown-it";
import {ArgumentParser} from "argparse";
import fs from "fs";
import path from "path";
import Token from "markdown-it/lib/token";
import _ from "lodash";
import cheerio from "cheerio";
import isUrl from "is-url";
import isAbsoluteUrl from "is-absolute-url";
import tempy from "tempy";
import child_process from "child_process";
import Root = cheerio.Root;

const INDEX_FILE:string = "README.md";
const markdownInstance = new MarkdownIt({
    html: false,
    xhtmlOut: false,
    breaks: false,
    linkify: false,
    typographer: true
});
markdownInstance
    .use(require("markdown-it-abbr"))
    .use(require("markdown-it-container"))
    .use(require("markdown-it-deflist"))
    .use(require("markdown-it-emoji"))
    .use(require("markdown-it-footnote"))
    .use(require("markdown-it-ins"))
    .use(require("markdown-it-mark"))
    .use(require("markdown-it-sub"))
    .use(require("markdown-it-sup"))
    .use(require("markdown-it-anchor"))
;

function getMarkdownFileId(markdownFile:string) : string {
    const $:Root = cheerio.load(markdownInstance.render(fs.readFileSync(markdownFile, "utf-8"), {}));
    return $("h1:first").attr("id");
}

function transformIndexFile(indexFile:string): Token[] {
    const indexContent:string = fs.readFileSync(indexFile, "utf-8");
    let tokens: Token[] = markdownInstance.parse(indexContent, {});
    _.each(tokens, (token: Token) => {
        if (token.type !== "inline") {
            return;
        }
        if (!_.isArray(token.children)) {
            return;
        }
        _.each(token.children, (childToken: Token) => {
            if (childToken.type === "link_open" && childToken.tag === "a") {
                _.each(childToken.attrs, (attr: [string, string], index: number) => {
                    const hrefTagName:string = _.first(attr);
                    const link:string = _.last(attr);
                    if (isUrl(link)) {
                        return;
                    }
                    let targetLinkFile:string = path.join(path.dirname(indexFile), link);
                    if (fs.lstatSync(targetLinkFile).isDirectory()) {
                        targetLinkFile = path.join(targetLinkFile, INDEX_FILE);
                    }
                    if (!fs.existsSync(targetLinkFile)) {
                        console.error(`LinkFile => ${targetLinkFile} not existed`);
                        return;
                    }
                    childToken.attrs[index][1] = `#${getMarkdownFileId(targetLinkFile)}`;
                    tokens = _.concat(tokens, transformIndexFile(targetLinkFile));
                });
            }
            if (childToken.type === "image" && childToken.tag === "img") {
                _.each(childToken.attrs, (attr: [string, string], index: number) => {
                    if (attr[0] !== "src") {
                        return;
                    }
                    const imageUrl:string = attr[1];
                    if (isAbsoluteUrl(imageUrl)) {
                        return;
                    }
                    if (isUrl(imageUrl)) {
                        childToken.attrs[index][1] = `https:${imageUrl}`;
                    }
                });
            }
        });
    });
    return tokens;
}

function main() {
    const argumentParser: ArgumentParser = new ArgumentParser({
        description: "VuePress to Document"
    });
    argumentParser.add_argument("--src", {help: "Source directory", required: true, dest: 'sourceDirectory'});
    argumentParser.add_argument("--output", {help: "Output file", required: true, dest: "outputFile"});
    const argumentResults:any = argumentParser.parse_args();

    const sourceDirectory:string = argumentResults.sourceDirectory;
    const outputFile:string = argumentResults.outputFile;
    const rootIndexFile:string = path.join(sourceDirectory, INDEX_FILE);
    if (!fs.existsSync(rootIndexFile)) {
        console.error(`${rootIndexFile} not exists`);
        process.exit(1);
    }
    const transformedTokens:Token[] = transformIndexFile(rootIndexFile);
    const renderHtml:string = markdownInstance.renderer.render(transformedTokens, markdownInstance.options, {});
    const tempHtmlFile:string = tempy.file({extension: "html"});
    fs.writeFileSync(tempHtmlFile, renderHtml, "utf-8");
    //const cmd = `pandoc -s --toc -c pandoc.css ${tempHtmlFile} -o ${outputFile}`;
    const cmd = `pandoc -s -c pandoc.css ${tempHtmlFile} -o ${outputFile}`;
    console.log(cmd);
    child_process.execSync(cmd);

}

main();
