// Which build this is (lessons UI-18, REL-11 from Louis's game-pipeline-kit):
// the commit the play copy was made from (tools/refresh_play.py tags every
// code link ?v=<hash>), or 'dev' when it runs from the source folder. Shown
// small on the map and written into every save.
export const BUILD = new URL(import.meta.url).searchParams.get('v') || 'dev';
