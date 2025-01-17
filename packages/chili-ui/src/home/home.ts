// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { Constants, I18n, IApplication, ObservableCollection, PubSub, RecentDocumentDTO } from "chili-core";
import { LanguageSelector } from "../components";
import { a, button, div, img, items, label, localize, span, svg } from "../controls";
import style from "./home.module.css";

export const Home = async (app: IApplication) => {
    let documentArray: RecentDocumentDTO[] = await app.storage.page(
        Constants.DBName,
        Constants.RecentTable,
        0,
    );
    let documents = new ObservableCollection(...documentArray);
    return div(
        { className: style.root },
        div(
            { className: style.left },
            div(
                { className: style.top },
                div(
                    { className: style.logo },
                    svg({ icon: "icon-chili" }),
                    span({
                        textContent: "CHILI3D",
                    }),
                ),
                button({
                    textContent: localize("command.document.new"),
                    onclick: () => PubSub.default.pub("executeCommand", "doc.new"),
                }),
                button({
                    textContent: localize("command.document.open"),
                    onclick: () => PubSub.default.pub("executeCommand", "doc.open"),
                }),
            ),
            div(
                { className: style.bottom },
                a({
                    textContent: "Github",
                    href: "https://github.com/xiangechen/chili3d",
                    target: "_blank",
                }),
            ),
        ),
        div(
            { className: style.right },
            label({ className: style.welcome, textContent: localize("home.welcome") }),
            div({ className: style.recent, textContent: localize("home.recent") }),
            items({
                className: style.documents,
                sources: documents,
                template: (item) =>
                    div(
                        {
                            className: style.document,
                            onclick: () => {
                                app.openDocument(item.id);
                            },
                        },
                        img({ className: style.img, src: item.image }),
                        div(
                            { className: style.description },
                            span({ className: style.title, textContent: item.name }),
                            span({
                                className: style.date,
                                textContent: new Date(item.date).toLocaleDateString(),
                            }),
                        ),
                        svg({
                            className: style.delete,
                            icon: "icon-times",
                            onclick: async (e) => {
                                e.stopPropagation();
                                if (window.confirm(I18n.translate("prompt.deleteDocument{0}", item.name))) {
                                    await app.storage.delete(
                                        Constants.DBName,
                                        Constants.DocumentTable,
                                        item.id,
                                    );
                                    await app.storage.delete(
                                        Constants.DBName,
                                        Constants.RecentTable,
                                        item.id,
                                    );
                                    documents.remove(item);
                                }
                            },
                        }),
                    ),
            }),
        ),
        LanguageSelector({ className: style.language }),
    );
};
