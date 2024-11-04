import { EVENTS, addKeyword } from "@builderbot/bot";
import { currentDate, currentMonth, currentMonthNumber, currentYear, datesNumber, months } from "date";
import puppeteer from "puppeteer";
import { join } from 'path'
import dotenv from 'dotenv'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import fsPromises from "node:fs/promises";
import { opcionesEstudianteFlow } from "~/app";
// import { opcionesEstudianteFlow } from "../app";
dotenv.config()
const todayTaskFlow = addKeyword(["1", "hoy"])
  .addAnswer(['Estamos buscando las tareas del dia de hoy', 'te respondemos en un minuto'], { capture: false }, async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
    const monthRta: string = ctx.body.toString().toLowerCase()
    console.log(`${process.env.PRIVATE_URL}/tareas?fecha=${currentDate()}&mes=${currentMonthNumber()}&ano=${currentYear()}&grado=${state.get('grade')}`)

    const browser = await puppeteer.launch({
      // headless: true,
      args: [
        "--disabled-setuid-sandbox",
        "--no-sandbox",
        // "--single-process",
        // "--no-zygote"
      ],
      executablePath: "/usr/bin/chromium-browser", 
      //solo para produccion se quita el comentario

    })
    const page = await browser.newPage()
            // http://localhost:3000/tareas?fecha=17&mes=4&ano=2024&grado=9
            await page.goto(`${process.env.PRIVATE_URL}/tareas?fecha=${currentDate()}&mes=${currentMonthNumber()}&ano=${currentYear()}&grado=${state.get('grade')}`, { waitUntil: "networkidle2" })

            setTimeout(async () => {
              await page.setViewport({ width: 1366, height: 768 });
              const bodyHandle = await page.$('body');
              const { height } = await bodyHandle.boundingBox();
              await bodyHandle.dispose();
              const calculatedVh = page.viewport().height;
              let vhIncrease = 0;
              while (vhIncrease + calculatedVh < height) {
                // Here we pass the calculated viewport height to the context
                // of the page and we scroll by that amount
                await page.evaluate(_calculatedVh => {
                  window.scrollBy(0, _calculatedVh);
                }, calculatedVh);
                // await page.waitForNetworkIdle();
                vhIncrease = vhIncrease + calculatedVh;
              }
              // Setting the viewport to the full height might reveal extra elements
              await page.setViewport({ width: 1366, height: calculatedVh });

              // Scroll back to the top of the page by using evaluate again.
              await page.evaluate(() => {
                window.scrollTo(0, 0);
              });
              
              await page.pdf({
                path: `${state.get('grade')}-${currentDate()}-${currentMonthNumber()}.pdf`,
                // path: `testing-2024.pdf`,
                format: 'a4',
                margin: { top: '10mm', bottom: '10mm', left: "10mm" }
              });
              await browser.close()
                .then(r => {
                  console.log('primero')
                  return gotoFlow(enviarTareaEstudiante)
                })
            }, 9000)
  })

  export const hacerOtraConsulta = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer(['Quieres hacer otra consulta?', '*1-* Si', '*2-* Terminar'] , { capture: true }, async (ctx, { fallBack, flowDynamic,gotoFlow,endFlow }) => {
    const rtaCtx = ctx.body
    if (rtaCtx === "1") {
        // await flowDynamic('Porfavor escribe una opción valida')
        return gotoFlow(opcionesEstudianteFlow)
        // return fallBack()
    }
    if(rtaCtx === "2") {
      return endFlow('Que tengas buena dia, escribeme si tienes mas consultas.')
    }
  }, [])
export const enviarTareaEstudiante = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer('Se ha generado el reporte de tarea exitosamente. ', null, async (_, { state, flowDynamic, gotoFlow }) => {
    console.log('segundo')
    await flowDynamic([{
      body: `Look at this`,
      media: join(`${state.get('grade')}-${state.get('date')}-${state.get('month')}.pdf`)
    }])
    // if(state.get('dniUsuario').length === 8){
    // console.log(`archivo ha sido borrado`, 'state.get(dniUsuario)', state.get('dniUsuario'));
    await fsPromises.unlink(`${state.get('grade')}-${state.get('date')}-${state.get('month')}.pdf`);
    //tendria que hacer la pregunta si quieres hacer otra consulta con las opciones de si o terminar.
    // await flowDynamic('Quieres hacer otra consulta?')
    return gotoFlow(hacerOtraConsulta)
    // }
  })

const todayTaskDate = addKeyword(["1", "fecha"])
  .addAnswer(['De que fecha quieres la tarea?, ejemplo: *1/mayo*'], { capture: true }, 
    async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
    const monthRta: string = ctx.body.toString().toLowerCase()

    if (monthRta.includes("/")) {
      const mm = monthRta.split("/")
      await state.update({ month: mm[1], date: mm[0] })
      if (datesNumber.includes(mm[0])) {
        if (months.includes(mm[1])) {
          //entonces recien realizamos la busqueda
          const indexMonth = months.indexOf(mm[1])
          await flowDynamic('estamos realizando la busqueda de tu tarea.')

          const browser = await puppeteer.launch({
            // headless: true,
            args: [
              "--disabled-setuid-sandbox",
              "--no-sandbox",
              // "--single-process",
              // "--no-zygote"
            ],
            executablePath: "/usr/bin/chromium-browser", //solo para produccion se quita el comentario

          })
        //   const browser: any = await puppeteer.launch({
        //     executablePath: '/usr/bin/chromium-browser',
        //     args: ['--no-sandbox', '--disable-dev-shm-usage'],
        // })
          if (indexMonth) {
            const page = await browser.newPage()
            // http://localhost:3000/tareas?fecha=17&mes=4&ano=2024&grado=9
            await page.goto(`${process.env.PRIVATE_URL}/tareas?fecha=${mm[0]}&mes=${indexMonth}&ano=${currentYear()}&grado=${state.get('grade')}`, { waitUntil: "domcontentloaded" })

            setTimeout(async () => {
              await page.setViewport({ width: 1366, height: 768 });
              const bodyHandle = await page.$('body');
              const { height } = await bodyHandle.boundingBox();
              await bodyHandle.dispose();
              const calculatedVh = page.viewport().height;
              let vhIncrease = 0;
              while (vhIncrease + calculatedVh < height) {
                // Here we pass the calculated viewport height to the context
                // of the page and we scroll by that amount
                await page.evaluate(_calculatedVh => {
                  window.scrollBy(0, _calculatedVh);
                }, calculatedVh);
                // await page.waitForNetworkIdle();
                vhIncrease = vhIncrease + calculatedVh;
              }
              // Setting the viewport to the full height might reveal extra elements
              await page.setViewport({ width: 1366, height: calculatedVh });

              // Scroll back to the top of the page by using evaluate again.
              await page.evaluate(() => {
                window.scrollTo(0, 0);
              });
              // await page.waitForNavigation({
              //   waitUntil: 'networkidle0',
              // });
              await page.pdf({
                path: `${state.get('grade')}-${mm[0]}-${mm[1]}.pdf`,
                // path: `testing-2024.pdf`,
                format: 'a4',
                margin: { top: '10mm', bottom: '10mm', left: "10mm" }
              });
              await browser.close()
                .then(r => {
                  console.log('primero')
                  return gotoFlow(enviarTareaEstudiante)
                })
            }, 9000)

          }

          // if (rta) console.log("rta", rta)

        } else {
          await flowDynamic('Escribe un mes valido')
          return fallBack()
        }
      } else {
        await flowDynamic('Escribe una fecha valida')
        return fallBack()
      }
    }
  })

export const tareasEstudiantesFlow = addKeyword(["2", "tareas", "tarea"])
  // .addAnswer(['Quieres la tarea de: ', '*1*-Hoy', '*2*-Fecha especifica'], { capture: true }, async (ctx, { flowDynamic }) => {
    .addAnswer(['Quieres la tarea de: ','*1*-Fecha especifica'], { capture: true }, async (ctx, { flowDynamic }) => {
    const choiceOption = ctx.body
    if (Number(choiceOption) !== 1 && Number(choiceOption) !== 2) {
      await flowDynamic('Porfavor escribe una opcion valida')
    }
  // }, [todayTaskFlow, todayTaskDate])
}, [todayTaskDate])
