export class Convertor{
    constructor(){

    }

    async convert(filepath) {
        fetch(filepath)
        .then((res) => res.text())
        .then((text) => {
          // do something with "text"
          //console.log(text);
          const lines = text.split("\n");
          //console.log(lines.length);
          const levels = [];
          lines.forEach( line => {
            const tokens = line.split(" ");
            const level = {};
            level.index = Number(tokens[0]);
            level.ballPos = { x: Number(tokens[1])/10, y: Number(tokens[2])/10, z: Number(tokens[3])/10 };
            level.cupPos = { x: Number(tokens[4])/10, y: Number(tokens[5])/10, z: Number(tokens[6])/10 };
            levels.push(level);
          })
         })
        .catch((e) => console.error(e));
      }
}