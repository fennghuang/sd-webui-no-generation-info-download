;(() => {
    let IS_DOWNLOADING_FOR_IMAGE_BROWSER = false
  
    const FILE_TYPE = ['png', 'jpeg', 'jpg']
    const TD_CLASS = '.no-geninfo-td'
    const FILE_SUFFIX = '_no_geninfo'
    const DOWNLOAD_TEXT = 'No Geninfo Download'
    const DOWNLOAD_ALL_TEXT = 'No Geninfo Download All'
    const DOWNLOAD_SELECTED_TEXT = 'No Geninfo Download Selected'
    const ORIGIN_DOWNLOAD_ALL_TEXT = 'Download All'
    const ORIGIN_DOWNLOAD_SELECTED_TEXT = 'Download Selected'
    const LISTEN_CONFIG = {
      '#save_txt2img': {
        isObserved: false
      },
      '#save_img2img': {
        isObserved: false
      },
      '#save_zip_txt2img': {
        isObserved: false
      },
      '#save_zip_img2img': {
        isObserved: false
      }
    }
  
    const tool = {
      promiseLimit: (arr, limit, iteratorFn) => {
        const { length } = arr
        const result = []
        let i = 0
        let finishedNum = 0
        const minLimit = Math.min(limit, length)
  
        return new Promise((resolve, reject) => {
          const request = async index => {
            const p = Promise.resolve()
              .then(() => iteratorFn(arr[index], index))
              .catch(err => reject(err))
            const res = await p
  
            result[index] = res
            finishedNum++
            if (finishedNum === length) {
              resolve(result)
            }
            if (i < length) {
              request(i)
              i++
            }
          }
  
          for (; i < minLimit; i++) {
            request(i)
          }
        })
      },
  
      formatName: (name, type) => {
        const arr = name.split('.')
        const fileType = arr.slice(-1)[0].toLowerCase()
        return arr
          .slice(0, -1)
          .concat(`${FILE_SUFFIX}.${type || fileType}`)
          .join('')
      },
  
      download: (url, name) => {
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.target = "_target"
        a.onclick = e => e.stopPropagation()
        a.click()
      }
    }
  
    async function getImageInfo (el, type = 'img', isNeedCanvas = true) {
      const image = document.createElement('img')
      switch (type) {
        case 'img':
          image.src = el.querySelector('img').src
          break
        case 'a':
          image.src = el.querySelector('a').href
          break
        case 'self':
          image.src = el.src
          break
        default:
          break
      }
  
      const fileType = image.src.split('.').slice(-1)[0].toLowerCase()
      const originName = image.src.split('/').slice(-1)[0]
      const originUrl = image.src
      const name = tool.formatName(originName)
  
      let canvas
  
      if (isNeedCanvas) {
        canvas = document.createElement('canvas')
        await image.decode()
        canvas.width = image.width
        canvas.height = image.height
        canvas.getContext('2d').drawImage(image, 0, 0)
      }
  
      return {
        dataUrl: canvas?.toDataURL(),
        type: fileType,
        name,
        originName,
        originUrl
      }
    }
  
    // function downloadImage() {
    //   let buttons = gradioApp().querySelectorAll(
    //     '[style="display: block;"].tabitem div[id$=_gallery] .thumbnail-item.thumbnail-lg',
    //   );
    //   let button = gradioApp().querySelector(
    //     '[style="display: block;"].tabitem div[id$=_gallery] .thumbnail-item.thumbnail-small.selected',
    //   );
  
    //   if (!button) button = [...buttons];
  
    //   const arr = button.length ? button : [button];
  
    //   arr?.length &&
    //     tool.promiseLimit(arr, 10, async (el) => {
    //       const { dataUrl, name } = await getImageInfo(el, 'img', true);
    //       tool.download(dataUrl, name);
    //     })
    //       .then(() => {})
    //       .catch((error) => console.log(error));
    // }
  
    function downloadImageForImageBrowser (id, type) {
      const idSelector = id ? `div[id='${id}']` : ''
      const buttons = gradioApp().querySelectorAll(
        `[style="display: block;"].tabitem ${idSelector} div[id$=_gallery] .thumbnail-item.thumbnail-lg`
      )
  
      const button = gradioApp().querySelector(
        `[style="display: block;"].tabitem ${idSelector} div[id$=_gallery] .thumbnail-item.thumbnail-small.selected`
      )
  
      const arr = [1, 3].includes(type) ? [...buttons] : button ? [button] : []
  
      if (!arr?.length) {
        IS_DOWNLOADING_FOR_IMAGE_BROWSER = false
        return
      }
  
      tool
        .promiseLimit(arr, 10, async el => {
          const { dataUrl, name, originName, originUrl } = await getImageInfo(
            el,
            'img',
            [1, 2]?.includes(type) ? false : true
          )
  
          switch (type) {
            case 1:
            case 2:
              tool.download(originUrl, originName)
              break
            case 3:
            case 4:
              tool.download(dataUrl, name)
              break
            default:
              break
          }
        })
        .then(() => {
          IS_DOWNLOADING_FOR_IMAGE_BROWSER = false
        })
        .catch(error => {
          IS_DOWNLOADING_FOR_IMAGE_BROWSER = false
          console.log(error)
        })
    }
  
    function initInject () {
      const appendFn = originDownloadTd => {
        originDownloadTd.forEach(item => {
          const { parentNode, classList } = item
  
          const removeChild = parentNode.querySelector(`${TD_CLASS}`)
          !!removeChild && parentNode.removeChild(removeChild)
  
          const { href } = item.querySelector('a')
          const fileType = href.split('.').slice(-1)[0].toLowerCase()
  
          if (!FILE_TYPE.includes(fileType)) {
            return
          }
  
          const td = document.createElement('td')
          const a = document.createElement('a')
          a.href = 'javascript:;'
          a.innerText = DOWNLOAD_TEXT
  
          a.onclick = async () => {
            const { dataUrl, name } = await getImageInfo(item, 'a')
            tool.download(dataUrl, name)
          }
  
          td.setAttribute(
            'class',
            [...classList]
              .filter(v => v !== 'download')
              .concat(TD_CLASS.replace('.', ''))
              .join(' ')
          )
          td.appendChild(a)
  
          parentNode.appendChild(td)
        })
      }
  
      function observeDownloadFiles (targetNode, selector, key) {
        const config = { attributes: false, childList: true, subtree: true }
        let timer
        const callback = (mutationList, observer) => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            observer.disconnect()
            LISTEN_CONFIG[key].isObserved = false
            const originDownloadTd = [...gradioApp().querySelectorAll(selector)]
            appendFn(originDownloadTd)
          }, 300)
        }
        const observer = new MutationObserver(callback)
        observer.observe(targetNode, config)
      }
  
      Object.keys(LISTEN_CONFIG).forEach(key => {
        gradioApp()
          .querySelector(key)
          ?.addEventListener('click', e => {
            const { id } = e.target
            const tabName = id.split('_').slice(-1)[0]
            const selector = `#download_files_${tabName} table.file-preview td.download`
            if (LISTEN_CONFIG[key].isObserved) return
            LISTEN_CONFIG[key].isObserved = true
            observeDownloadFiles(e.target.parentNode.parentNode, selector, key)
          })
      })
    }
  
    function initLightboxModal () {
      const modal =  document.querySelector('#lightboxModal')
      const el = modal.querySelector('.modalControls')
      const last = el.querySelector('span:last-child')
      const span = document.createElement('span')
      span.title = ''
      span.innerText = DOWNLOAD_TEXT
      span.setAttribute('class', 'cursor no-geninfo-modal-btn')
      span.onclick = async e => {
        e.stopPropagation()
        e.preventDefault()
        const img = modal.querySelector('#modalImage')
        const { dataUrl, name } = await getImageInfo(img, 'self')
        tool.download(dataUrl, name)
      }
      el.insertBefore(span, last)
    }
  
    function initInjectForImageBrowser () {
      const imageBrowser = gradioApp().querySelector('#tab_image_browser')
      const buttonEl = imageBrowser
        ?.querySelector('div[id$=image_browser_gallery_controls]')
        ?.querySelector('div')
        ?.querySelector('button')
      const buttonClassName = buttonEl?.className
  
      const imageBrowserContainers =
        imageBrowser?.querySelectorAll('.image_browser_container') || []
  
      ;[...imageBrowserContainers].forEach(container => {
        const { id } = container
        const el = container
          .querySelector('div')
          .querySelector('div')
          .querySelector('div')
  
        const div = document.createElement('div')
        div.setAttribute('class', 'gradio-row no-geninfo-for-image-browser')
  
        div.onclick = e => {
          e.stopPropagation()
          if (IS_DOWNLOADING_FOR_IMAGE_BROWSER) return
          IS_DOWNLOADING_FOR_IMAGE_BROWSER = true
  
          const { classList, dataset = {} } = e.target
          const { type, pid } = dataset
          if (!classList.contains('no-geninfo-for-image-browser-btn')) return
  
          downloadImageForImageBrowser(pid, +type)
        }
        div.innerHTML = `
            <button class="${buttonClassName} no-geninfo-for-image-browser-btn" data-type="1" data-pid="${id}">${ORIGIN_DOWNLOAD_ALL_TEXT}</button>
            <button class="${buttonClassName} no-geninfo-for-image-browser-btn" data-type="2" data-pid="${id}">${ORIGIN_DOWNLOAD_SELECTED_TEXT}</button>
            <button class="${buttonClassName} no-geninfo-for-image-browser-btn" data-type="3" data-pid="${id}">${DOWNLOAD_ALL_TEXT}</button>
            <button class="${buttonClassName} no-geninfo-for-image-browser-btn" data-type="4" data-pid="${id}">${DOWNLOAD_SELECTED_TEXT}</button>
       `
        el.appendChild(div)
      })
    }
  
    function init () {
      const targetNode = gradioApp()
      const config = { attributes: false, childList: true, subtree: true }
  
      function observerForImageBrowser () {
        let timer
        let timerWrap
        const callback = (mutationList, observer) => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            const find = document.querySelector('#tab_image_browser')
            console.log('is find #tab_image_browser', !!find)
            if (find) {
              observer.disconnect()
              clearTimeout(timerWrap)
              initInjectForImageBrowser()
            }
          }, 300)
        }
        const observer = new MutationObserver(callback)
        observer.observe(targetNode, config)
        timerWrap = setTimeout(() => {
          observer.disconnect()
          clearTimeout(timer)
          initInjectForImageBrowser()
        }, 30000)
      }
  
      let timer
      const callback = (mutationList, observer) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const find = document.querySelector('#footer')
          if (find) {
            observer.disconnect()
            initInject()
            initLightboxModal()
            console.log('start observerForImageBrowser')
            observerForImageBrowser()
          }
        }, 300)
      }
      const observer = new MutationObserver(callback)
      observer.observe(targetNode, config)
    }
  
    init()
  
    // TODO
    // window.noGeninfoDownloadImage = downloadImage
  })()
  