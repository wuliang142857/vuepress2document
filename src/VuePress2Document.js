#!/usr/bin/env node
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const markdown_it_1 = __importDefault(require("markdown-it"));
const argparse_1 = require("argparse");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const cheerio_1 = __importDefault(require("cheerio"));
const is_url_1 = __importDefault(require("is-url"));
const is_absolute_url_1 = __importDefault(require("is-absolute-url"));
const tempy_1 = __importDefault(require("tempy"));
const child_process_1 = __importDefault(require("child_process"));
const INDEX_FILE = "README.md";
const markdownInstance = new markdown_it_1.default({
    html: false,
    xhtmlOut: false,
    breaks: false,
    linkify: false,
    typographer: true
});
markdownInstance
    .use(require("markdown-it-abbr"))
    .use(require("markdown-it-container"), "tip")
    .use(require("markdown-it-container"), "warning")
    .use(require("markdown-it-deflist"))
    .use(require("markdown-it-emoji"))
    .use(require("markdown-it-footnote"))
    .use(require("markdown-it-ins"))
    .use(require("markdown-it-mark"))
    .use(require("markdown-it-sub"))
    .use(require("markdown-it-sup"))
    .use(require("markdown-it-anchor"));
const REFERENCE_DOCX_FILENAME = "pretty-reference.docx";
const REFERENCE_DOCX_FILE_PATH = path_1.default.join(__dirname, REFERENCE_DOCX_FILENAME);
function getMarkdownFileId(markdownFile) {
    const $ = cheerio_1.default.load(markdownInstance.render(fs_1.default.readFileSync(markdownFile, "utf-8"), {}));
    return $("h1:first").attr("id");
}
function transformIndexFile(indexFile) {
    const indexContent = fs_1.default.readFileSync(indexFile, "utf-8");
    let tokens = markdownInstance.parse(indexContent, {});
    lodash_1.default.each(tokens, (token) => {
        if (token.type !== "inline") {
            return;
        }
        if (!lodash_1.default.isArray(token.children)) {
            return;
        }
        lodash_1.default.each(token.children, (childToken) => {
            if (childToken.type === "link_open" && childToken.tag === "a") {
                lodash_1.default.each(childToken.attrs, (attr, index) => {
                    const hrefTagName = lodash_1.default.first(attr);
                    const link = lodash_1.default.last(attr);
                    if (is_url_1.default(link)) {
                        return;
                    }
                    let targetLinkFile = path_1.default.join(path_1.default.dirname(indexFile), link);
                    if (fs_1.default.lstatSync(targetLinkFile).isDirectory()) {
                        targetLinkFile = path_1.default.join(targetLinkFile, INDEX_FILE);
                    }
                    if (!fs_1.default.existsSync(targetLinkFile)) {
                        console.error(`LinkFile => ${targetLinkFile} not existed`);
                        return;
                    }
                    childToken.attrs[index][1] = `#${getMarkdownFileId(targetLinkFile)}`;
                    tokens = lodash_1.default.concat(tokens, transformIndexFile(targetLinkFile));
                });
            }
            if (childToken.type === "image" && childToken.tag === "img") {
                lodash_1.default.each(childToken.attrs, (attr, index) => {
                    if (attr[0] !== "src") {
                        return;
                    }
                    const imageUrl = attr[1];
                    if (is_absolute_url_1.default(imageUrl)) {
                        return;
                    }
                    if (is_url_1.default(imageUrl)) {
                        childToken.attrs[index][1] = `https:${imageUrl}`;
                    }
                });
            }
        });
    });
    return tokens;
}
function main() {
    const argumentParser = new argparse_1.ArgumentParser({
        description: "VuePress to Document"
    });
    argumentParser.add_argument("--src", { help: "Source directory", required: true, dest: 'sourceDirectory' });
    argumentParser.add_argument("--output", { help: "Output file", required: true, dest: "outputFile" });
    const argumentResults = argumentParser.parse_args();
    const sourceDirectory = argumentResults.sourceDirectory;
    const outputFile = argumentResults.outputFile;
    const rootIndexFile = path_1.default.join(sourceDirectory, INDEX_FILE);
    if (!fs_1.default.existsSync(rootIndexFile)) {
        console.error(`${rootIndexFile} not exists`);
        process.exit(1);
    }
    const transformedTokens = transformIndexFile(rootIndexFile);
    const renderHtml = markdownInstance.renderer.render(transformedTokens, markdownInstance.options, {});
    const tempHtmlFile = tempy_1.default.file({ extension: "html" });
    fs_1.default.writeFileSync(tempHtmlFile, renderHtml, "utf-8");
    const cmd = `pandoc --reference-doc ${REFERENCE_DOCX_FILE_PATH} ${tempHtmlFile} -o ${outputFile}`;
    console.log(cmd);
    child_process_1.default.execSync(cmd);
}
main();
//# sourceMappingURL=VuePress2Document.js.map