export default function(data) {
    return `<li class="message" style="color: ${data.colour}">
      <a download="${data.fileDescription.name}" href="${data.url}">
        Received file "${data.fileDescription.name}" (${data.bytes(data.fileDescription.size)})
      </a>
    </li>`;
}
