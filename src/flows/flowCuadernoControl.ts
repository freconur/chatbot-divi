import { EVENTS, addKeyword } from "@builderbot/bot";
import { currentDate, currentMonth, currentMonthNumber, currentYear, datesNumber, months } from "date";
import puppeteer from "puppeteer";
import { join } from 'path'
import dotenv from 'dotenv'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import fsPromises from "node:fs/promises";
import { hacerOtraConsulta } from "./flowTareas";

dotenv.config()


export const enviarCuadernoControl = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer('Se ha generado cuaderno de control exitosamente. ', null, async (_, { state, flowDynamic, gotoFlow }) => {
    console.log('segundo')
    await flowDynamic([{
      body: `Look at this`,
      media: join(`${state.get('grade')}-${state.get('date')}-${state.get('month')}.pdf`)
    }])
    await fsPromises.unlink(`${state.get('grade')}-${state.get('date')}-${state.get('month')}.pdf`);
    return gotoFlow(hacerOtraConsulta)
  })

export const cuadernoControlDate =
  addKeyword(["1", "fecha"])
    .addAnswer(["De que fecha quieres las notificaciones?, ejemplo: *1/octubre*"], { capture: true },
      async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
        const monthRta: string = ctx.body.toString().toLowerCase()
        if (monthRta.includes("/")) {
          const mm = monthRta.split("/")
          console.log('mm', mm)
          await state.update({ month: mm[1], date: mm[0] })
          if (datesNumber.includes(mm[0])) {
            if (months.includes(mm[1])) {
              const indexMonth = months.indexOf(mm[1])
              await flowDynamic('estamos realizando la busqueda de tu tarea.')
              console.log('indexMonth', indexMonth)

              const browser = await puppeteer.launch({
                args: [
                  "--disabled-setuid-sandbox",
                  "--no-sandbox",
                ],
                executablePath: "/usr/bin/chromium-browser", //solo para produccion se quita el comentario
              })

              if (indexMonth) {
                const page = await browser.newPage()
                console.log('state', state.getMyState())
                // http://localhost:3000/tareas?fecha=17&mes=4&ano=2024&grado=9
                await page.goto(`${process.env.PRIVATE_URL}/cuaderno-de-control?fecha=${mm[0]}&mes=${indexMonth}&ano=${currentYear()}&grado=${state.get('grade')}`, { waitUntil: "networkidle2" })
                //se tiene que probar la promesa para saber si realmente esta esperando la respuesta o se va de lanza con el resolve en true

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
                    path: `${state.get('grade')}-${state.get('date')}-${state.get('month')}.pdf`,
                    // path: `testing-2024.pdf`,
                    format: 'a4',
                    margin: { top: '10mm', bottom: '10mm', left: "10mm" }
                  })
                  // .then(response => console.log('response', response.))
                  await browser.close()
                    .then(r => {
                      console.log('primero')
                      // resolve(true)
                      return gotoFlow(enviarCuadernoControl)
                    })
                  // const newPromise = new Promise<boolean>((resolve, reject) => {
                  //   try {

                  //   } catch (error) {
                  //     console.log('error', error)
                  //   }

                  // })
                }, 9000)
                // newPromise.then(rta => console.log('rta', rta))
              }
            } else {
              await flowDynamic('escribe un mes valido.')
              return fallBack()
            }
          } else {
            await flowDynamic('escribe una fecha valida.')
            return fallBack()
          }
        }
      })



export const cuadernoControlFlow =
  addKeyword(["3", "cuaderno", "control", "cuaderno de control", "cuaderno control"])
    .addAnswer(["Quieres las notificacion de:", "*1-*Fecha especifica"], { capture: true }, async (ctx, { flowDynamic }) => {

      const choiceOption = ctx.body
      console.log('choiceOption', choiceOption)
      if (Number(choiceOption) !== 1) {
        await flowDynamic('Porfavor escribe una opcion valida')
      }
    }, [cuadernoControlDate])