"use strict";

document.addEventListener("DOMContentLoaded", function () {
    new TimeViz2();
});

let showdetail; // Global helper functions
let showcat;
let showtag;

class TimeViz2 {
    constructor() {

        this.tec_container = document.getElementById("tec-container");
        this.tec_container.innerHTML = "";
        this.tec_count = document.getElementById("tec-count");
    

        fetch("json/icons.json")
            .then(response => response.json())
            .then(obj => {
                this.icons = obj;
            })
            .catch(err => {
                console.error(err);
            });

        fetch("json/techniques.json")
            .then(response => {
                document.getElementById("last-modified").innerText = response.headers.get("last-modified");
                return response.json();
            })
            .then(obj => {
                this.techniques = obj;
                let html;

                html = this.techniques.reduce((html, t) => {
                    return html +
                        `<div class="tec-item p-1" data-id="${t.id}">
                            <div class="p-2 border rounded bg-white" data-bs-toggle="tooltip" title="${t.id}">
                                <a href="javascript:showdetail('${t.id}')"><img class="img-fluid" src="img/previews/${t.figure.file}" alt="${t.id}"/></a>
                            </div>
                        </div>`
                }, "");
                this.tec_container.innerHTML = html;

                this.tags = {};
                this.techniques.forEach((t, i) => {
                    t.tags.forEach(tag => {
                        if (this.tags[tag] === undefined) this.tags[tag] = [];
                        this.tags[tag].push(i);
                    });
                });

                html = Object.keys(this.tags).sort().reduce((html, tag) => {
                    return html +
                        // `<a href="javascript:showtag('${tag}');"><span class="badge rounded-pill bg-secondary me-1">${tag} (${this.tags[tag].length})</span></a>`
                        `<a href="javascript:showtag('${tag}');"><span class="badge rounded-pill bg-secondary me-1">${tag}</span></a>`
                }, "");
                document.getElementById("tags").innerHTML = html;

                this.tec_byId = {};
                this.tec_visible = [];
                this.techniques.forEach((t, i) => {
                    t.index = i;
                    t.htmlItem = this.tec_container.children.item(i);
                    this.tec_byId[t.id] = t;
                });

                this.tec_count.textContent = this.techniques.length.toString();

                this.updateAccordingToQueryString();
            })
            .catch(err => {
                console.error(err);
            });

        this.tec_detail = bootstrap.Modal.getOrCreateInstance(document.querySelector('#tec-detail'));
        this.tec_detail._element.addEventListener("hidden.bs.modal", () => {
            this.query.delete("detail");
            this.pushHistoryState();
        });

        // Store the relevant elements from the detail view for easy access
        this.detail = ["title", "badges", "text", "references", "caption", "source", "image"]
            .reduce((d, field) => Object.assign(d, {[field]: document.getElementById(`detail-${field}`)}), {});

        document.getElementById("bibtex-btn-book").addEventListener("click", () => navigator.clipboard.writeText(
`@Book{Aigner23TimeVizSecondEdition,
  author    = {Aigner, Wolfgang and Miksch, Silvia and Schumann, Heidrun and Tominski, Christian},
  publisher = {Springer},
  title     = {{Visualization of Time-Oriented Data}},
  year      = {2023},
  edition   = {Second Edition},
  doi       = {?},
  url       = {https://timeviz.net},
}        
`));

        document.getElementById("bibtex-btn-browser").addEventListener("click", () => navigator.clipboard.writeText(
`@Misc{Tominski23TimeVizBrowser,
  author       = {Christian Tominski and Wolfgang Aigner},
  howpublished = {https://browser.timeviz.net},
  note         = {Version 2.0},
  title        = {{The TimeViz Browser -- A Visual Survey of Visualization Techniques for Time-Oriented Data}},
  year         = {2023},
}
`));
        document.getElementById("detail-btn-url").addEventListener("click", () => navigator.clipboard.writeText(window.location.toString()));
        document.getElementById("detail-btn-prev").addEventListener("click", () => this.navigate(-1));
        document.getElementById("detail-btn-next").addEventListener("click", () => this.navigate(+1));

        this.search = document.getElementById("search");
        this.search.addEventListener("input", () => {
            if (this.search.value !== "") {
                this.query.set("search", this.search.value);
            } else {
                this.query.delete("search");
            }
            this.filter();
        });

        document.getElementById("clear-search").addEventListener("click", () => {
            this.search.value = "";
            this.query.delete("search");
            this.filter();
        });

        this.help = document.getElementById("help");
        this.help = new bootstrap.Collapse(this.help, {toggle: false});
        document.getElementById("toggle-help").addEventListener("click", () => {
            this.help.toggle();
        });

        document.getElementById("reset-filters").addEventListener("click", () => {
            this.resetfilters();
        });

        this.switches = document.querySelectorAll(".cat-switch input");
        this.switches.forEach(input => {
            let [cat, what] = input.id.split("-");

            input.addEventListener("change", () => {
                if (what === 'want' || what === 'hide') {
                    this.query.set(cat, what);
                } else { // 'indifferent'
                    this.query.delete(cat);
                }
                this.filter();
            });
        });

        window.addEventListener('resize', () => this.layout());
        window.addEventListener('popstate', () => this.updateAccordingToQueryString());

        showdetail = this.showdetail.bind(this);
        showcat = this.showcat.bind(this);
        showtag = this.showtag.bind(this);
    }

    filter() {
        this.pushHistoryState();

        const search = this.search.value.toLowerCase(); // The search string
        const filter = { // Store for 'want' and 'hide' categories
            want: [],
            hide: []
        }
        for (const [cat, what] of this.query.entries()) {
            // filter[what] && ensures that we only consider query parameters whose values are either 'want' or 'hide'
            filter[what] && filter[what].push(cat); // Add category either to 'want' or 'hide'
        }

        this.tec_visible = this.techniques.filter(t => { // Filter each technique separately


            // Search for techniques according to search string
            let isSearched = true;
            if (search.length > 0) { // If the search string has content
                let match = false;
                // Search individually in different contents (can skip some contents if match has already been found)
                match = match || (t.id.toLowerCase().indexOf(search) >= 0); // Search in the id
                match = match || (t.categories.join().toLowerCase().indexOf(search) >= 0); // Search in the categories
                match = match || (t.tags.join().toLowerCase().indexOf(search) >= 0); // Search in the tags
                match = match || (t.text.toLowerCase().indexOf(search) >= 0); // Search in the main text
                match = match || (t.figure.caption.toLowerCase().indexOf(search) >= 0); // Search in the caption text
                match = match || (t.figure.source.toLowerCase().indexOf(search) >= 0); // Search in the source text
                match = match || (t.references.reduce((m, r) => m || r.toLowerCase().indexOf(search) >= 0, match));  // Search in references

                isSearched = match;
            }

            // Search for wanted techniques
            let isWanted = true;
            for (let w of filter.want) { // Check if technique has **all** wanted categories
                if (t.categories.indexOf(w) < 0) {
                    isWanted = false;
                    break;
                }
            }

            // Check if techniques is marked for hiding
            let isFiltered = false;
            for (let c of t.categories) { // Check if **any** of the technique's categories is marked
                if (filter.hide.indexOf(c) >= 0) {
                    isFiltered = true;
                    break;
                }
            }

            return (t.visible = !(isFiltered || !isWanted || !isSearched));
        });

        // Update the technique counter
        this.tec_count.textContent = (this.tec_visible.length === this.techniques.length) ? this.techniques.length : this.tec_visible.length + "/" + this.techniques.length;

        this.layout();
    }

    layout() {
        let left = 0;
        let top = 0;
        let size = 150; // Preferred tile size
        const ww = window.innerWidth; // Window size needed to limit the randomly generated positions
        const wh = window.innerHeight; // when filtered tiles fly off the screen
        const tw = this.tec_container.getBoundingClientRect().width;

        let tilesPerRow = Math.floor(tw / size);
        if (tilesPerRow < 3) { // Ensure at least three tiles per row
            size = tw / 3;
        } else { // Use remaining space for increased tile size
            let remainingSpace = tw - size * tilesPerRow;
            size = Math.floor(size + remainingSpace / tilesPerRow);
        }

        let last_row_empty = true;

        for (const technique of this.techniques) { // Lay out all items
            const item = technique.htmlItem;
            if (technique.visible) { // Visible items
                last_row_empty = false;
                item.style.width = `${size}px`; // Adjusted size
                item.style.height = `${size}px`;
                item.style.left = `${left}px`; // Calculate positions of basic grid
                item.style.top = `${top}px`;
                item.style.transform = "";
                left += size;
                if (left + size > tw) {
                    top += size;
                    left = 0;
                    last_row_empty = true;
                }
            } else { // Filtered items
                item.style.left = `${ww + 200 + Math.random() * 100}px`; // Calculate random out-of-sight position
                item.style.top = `${Math.random() * wh}px`;
                item.style.transform = `rotate(${Math.random() * 360}deg)`;
            }
        }
        // Adjust minHeight to make container at least as high as the calculated grid layout
        this.tec_container.style.minHeight = `${top + ((last_row_empty) ? 0 : size)}px`;
    }

    showdetail(id) {
        this.query.set("detail", id); // Store id in query string
        this.pushHistoryState();

        this.updatedetail(); // Update only the detail view (filters and search have not been changed)
    }

    showcat(cat) {
        this.query.delete("detail");
        this.query.set("search", cat);
        this.pushHistoryState();

        this.updateAccordingToQueryString(); // Update all
    }

    showtag(tag) {
        this.query.delete("detail");
        this.query.set("search", tag);
        this.pushHistoryState();

        this.updateAccordingToQueryString(); // Update all
    }

    resetfilters() {
        this.switches.forEach(input => {
            let [cat, what] = input.id.split("-");
            this.query.delete(cat);
        });
        this.pushHistoryState();

        this.updateAccordingToQueryString(); // Update all
    }

    navigate(direction) {
        if (this.tec_visible.length === 0) return; // Do not navigate when there are no visible techniques

        let index = this.detail.technique.index; // Start from current technique of detail view
        do {
            index += direction;
            if (index >= this.techniques.length) index = 0;
            if (index < 0) index = this.techniques.length - 1;
        } while (!this.techniques[index].visible); // Search for technique that is visible

        if (index !== this.detail.technique.index) this.showdetail(this.techniques[index].id); // If we found something, show it
    }

    updatefilters() {
        this.switches.forEach(input => { // Set checked-state of all switches
            let [cat, what] = input.id.split("-");
            if (what !== "want" && what !== "hide") what = null; // Map non-want and non-hide to null (aka. indifferent)
            input.checked = (this.query.get(cat) === what); // Check switch if there is a match with the query string
        });
    }

    updatesearch() {
        const s = this.query.get("search"); // Set text in search field
        this.search.value = (s !== null) ? s : "";
    }

    updatedetail() {
        const id = this.query.get("detail");
        if (id == null || id === "") {
            // Hide the detail view
            this.tec_detail.hide();
            return;
        }

        // Fetch information from item element to detail view
        const technique = this.tec_byId[id];

        this.detail.title.innerText = technique.id;

        let badges = "";
        badges += technique.categories
            .map(cat => `<a href="javascript:showcat('${cat}');"><span class="badge rounded-pill bg-secondary me-1"><i class="ico-timeviz-${this.icons[cat]} mx-1"></i></span></a>`)
            .join('');

        badges += (technique.tags.length === 0) ? '' : technique.tags
            .map(tag => `<a href="javascript:showtag('${tag}');"><span class="badge rounded-pill bg-secondary me-1">${tag}</span></a>`)
            .join('');

        this.detail.badges.innerHTML = badges;

        this.detail.text.innerHTML = technique.text
            .replace(/@link\(([^)]+)\)/g, (match, grp) => {
                return `javascript:showdetail('${grp}');`;
            });

        this.detail.references.innerHTML = technique.references.map(r => `<li>${r}</li>`).join("\n");

        this.detail.caption.innerHTML = technique.figure.caption
        this.detail.source.innerHTML = technique.figure.source;
        this.detail.image.src = "img/full/" + technique.figure.file;
        this.detail.technique = technique; // Keep track of which item is currently visible in the detail view

        this.tec_detail.show(); // Show the detail view
    }

    updateAccordingToQueryString() {
        this.query = new URLSearchParams(document.location.search);

        this.updatefilters();
        this.updatesearch();

        this.filter();
        this.layout();

        this.updatedetail();
    }

    pushHistoryState() {
        const qs = this.query.toString(); // Construct query string
        if (window.location.search.substring(1) !== qs) { // Check if current state is different from query string
            window.history.pushState({}, "", "?" + qs); // Add new state
        }
    }
}